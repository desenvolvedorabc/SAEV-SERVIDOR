import { Injectable, Logger } from '@nestjs/common'
import { InjectConnection, InjectRepository } from '@nestjs/typeorm'
import * as Bluebird from 'bluebird'
import { Connection, In, Repository } from 'typeorm'

import { isAnswerCorrect } from '../../../utils/is-answer-correct'
import { TypeAssessmentEnum } from '../../assessment/model/enum/type-assessment.enum'
import { StudentTest } from '../../release-results/model/entities/student-test.entity'
import { StudentTestAnswer } from '../../release-results/model/entities/student-test-answer.entity'
import { ReportDescriptor } from '../../reports/model/entities/report-descriptor.entity'
import { ReportEdition } from '../../reports/model/entities/report-edition.entity'
import { ReportNotEvaluated } from '../../reports/model/entities/report-not-evaluated.entity'
import { ReportQuestion } from '../../reports/model/entities/report-question.entity'
import { ReportRace } from '../../reports/model/entities/report-race.entity'
import { ReportSubject } from '../../reports/model/entities/report-subject.entity'
import { Student } from '../../student/model/entities/student.entity'
import { SubjectTypeEnum } from '../../subject/model/enum/subject.enum'
import { Test } from '../../test/model/entities/test.entity'
import { JobDescriptorsService } from './job-descriptor.service'
import { JobNotEvaluatedService } from './job-not-evaluated.service'
import { JobQuestionService } from './job-question.service'
import { JobRaceService } from './job-race.service'

@Injectable()
export class ReprocessSchoolClassService {
  private readonly logger = new Logger(ReprocessSchoolClassService.name)

  constructor(
    @InjectConnection()
    private readonly connection: Connection,

    @InjectRepository(ReportSubject)
    private readonly reportSubjectRepository: Repository<ReportSubject>,

    @InjectRepository(ReportQuestion)
    private readonly reportQuestionRepository: Repository<ReportQuestion>,

    @InjectRepository(ReportRace)
    private readonly reportRaceRepository: Repository<ReportRace>,

    @InjectRepository(ReportDescriptor)
    private readonly reportDescriptorRepository: Repository<ReportDescriptor>,

    @InjectRepository(ReportNotEvaluated)
    private readonly reportNotEvaluatedRepository: Repository<ReportNotEvaluated>,

    private readonly jobNotEvaluatedService: JobNotEvaluatedService,
    private readonly jobRaceService: JobRaceService,
    private readonly jobDescriptorsService: JobDescriptorsService,
    private readonly jobQuestionService: JobQuestionService,
  ) {}

  /**
   * Regenera ReportSubjects (e filhos) por turma de forma preservando-histórico:
   * usa `ReportSubject.idStudents` original como população (não consulta turma atual),
   * faz UPDATE in-place (não delete+insert).
   * Filhos do ReportSubject (race, question) e do ReportEdition de turma
   * (descriptor, not_evaluated) ligados ao mesmo teste são apagados e recriados.
   */
  async regenerate(
    assessmentId: number,
    countyId: number,
    type: TypeAssessmentEnum,
    affectedTestIds: number[],
  ): Promise<void> {
    if (!affectedTestIds.length) {
      this.logger.warn(
        `Skipping school-class reprocess for assessment=${assessmentId} county=${countyId}: no affected tests`,
      )
      return
    }

    const reportEditions = await this.findSchoolClassReportEditions(
      assessmentId,
      countyId,
      type,
    )

    if (!reportEditions.length) {
      this.logger.log(
        `No school-class report editions for assessment=${assessmentId} county=${countyId}`,
      )
      return
    }

    const examsById = await this.loadExamsById(affectedTestIds)

    await Bluebird.map(
      reportEditions,
      async (reportEdition) => {
        const subjects = await this.reportSubjectRepository.find({
          where: {
            reportEdition: { id: reportEdition.id },
            test: { TES_ID: In(affectedTestIds) },
          },
          relations: ['test'],
        })

        await Bluebird.map(
          subjects,
          async (subject) => {
            const exam = examsById.get(subject.test.TES_ID)
            if (!exam) {
              this.logger.warn(
                `Exam ${subject.test.TES_ID} not loaded; skipping subject ${subject.id}`,
              )
              return
            }
            await this.regenerateSubject(
              reportEdition,
              subject,
              exam,
              assessmentId,
            )
          },
          { concurrency: 3 },
        )
      },
      { concurrency: 2 },
    )
  }

  private async regenerateSubject(
    reportEdition: ReportEdition,
    reportSubject: ReportSubject,
    exam: Test,
    assessmentId: number,
  ): Promise<void> {
    const idStudents = reportSubject.idStudents ?? []
    if (!idStudents.length) {
      this.logger.warn(
        `ReportSubject ${reportSubject.id} (test ${exam.TES_ID}, edition ${reportEdition.id}) has no idStudents; skipping (legacy report)`,
      )
      return
    }

    const subjectType = exam.TES_DIS?.DIS_TIPO
    if (
      subjectType !== SubjectTypeEnum.OBJETIVA &&
      subjectType !== SubjectTypeEnum.LEITURA
    ) {
      this.logger.warn(
        `ReportSubject ${reportSubject.id} has unsupported subject type ${subjectType}; skipping`,
      )
      return
    }

    if (!reportEdition.schoolClass?.TUR_ID) {
      this.logger.error(
        `ReportEdition ${reportEdition.id} has no schoolClass; skipping subject ${reportSubject.id}`,
      )
      return
    }

    const numericIds = idStudents
      .map((id) => Number(id))
      .filter((n) => Number.isFinite(n))

    const studentSubmissions = await this.loadStudentSubmissions(
      exam.TES_ID,
      numericIds,
    )

    const allStudents = await this.loadStudents(numericIds)

    const totalStudents = idStudents.length
    const ids = idStudents

    const updatedSubject = this.recalculateSubject(
      reportSubject,
      exam,
      studentSubmissions,
      totalStudents,
      ids,
    )

    await this.deleteSubjectChildren(reportSubject.id)
    await this.deleteEditionChildrenForTest(reportEdition.id, exam.TES_ID)

    const savedSubject = await this.reportSubjectRepository.save(updatedSubject)

    await Promise.all([
      this.jobNotEvaluatedService.generateBySchoolClass({
        totalStudents,
        exam,
        reportEdition,
        studentSubmissions,
        ids,
      }),
      this.jobRaceService.generateReportRacesBySchoolClass({
        reportSubject: savedSubject,
        students: allStudents,
        studentSubmissions,
        exam,
      }),
      this.jobDescriptorsService.generateReportDescriptorBySchoolClass({
        exam,
        reportEdition,
        studentSubmissions,
      }),
      this.jobQuestionService.generateReportQuestionBySchoolClass({
        assessmentId,
        reportSubject: savedSubject,
        studentSubmissions,
        exam,
        schoolClassId: reportEdition.schoolClass.TUR_ID,
      }),
    ])
  }

  private async findSchoolClassReportEditions(
    assessmentId: number,
    countyId: number,
    type: TypeAssessmentEnum,
  ): Promise<ReportEdition[]> {
    return this.connection
      .getRepository(ReportEdition)
      .createQueryBuilder('RE')
      .innerJoin('RE.edition', 'AVA')
      .innerJoinAndSelect('RE.schoolClass', 'TUR')
      .innerJoin('TUR.TUR_ESC', 'ESC')
      .where('AVA.AVA_ID = :assessmentId', { assessmentId })
      .andWhere('RE.type = :type', { type })
      .andWhere('ESC.ESC_MUN = :countyId', { countyId })
      .getMany()
  }

  private async loadExamsById(testIds: number[]): Promise<Map<number, Test>> {
    const exams = await this.connection
      .getRepository(Test)
      .createQueryBuilder('TESTE')
      .select([
        'TESTE.TES_ID',
        'TESTE.TES_ANO',
        'SERIE.SER_ID',
        'TES_DIS.DIS_ID',
        'TES_DIS.DIS_NOME',
        'TES_DIS.DIS_TIPO',
      ])
      .innerJoin('TESTE.TES_SER', 'SERIE')
      .innerJoin('TESTE.TES_DIS', 'TES_DIS')
      .where('TESTE.TES_ID IN (:...ids)', { ids: testIds })
      .getMany()

    return new Map(exams.map((e) => [e.TES_ID, e]))
  }

  private async loadStudentSubmissions(
    testId: number,
    studentIds: number[],
  ): Promise<StudentTest[]> {
    if (!studentIds.length) return []

    return this.connection
      .getRepository(StudentTest)
      .createQueryBuilder('ALUNO_TESTE')
      .select([
        'ALUNO_TESTE',
        'ALUNO.ALU_ID',
        'ALU_PEL.PEL_ID',
        'questionTemplate.TEG_ID',
        'questionTemplate.TEG_RESPOSTA_CORRETA',
        'questionTemplate.TEG_ANULADA',
        'TEG_MTI.MTI_ID',
      ])
      .innerJoin(
        'ALUNO_TESTE.ALT_TES',
        'TESTE',
        'TESTE.TES_ID = ALUNO_TESTE.ALT_TES_ID',
      )
      .innerJoin(
        'ALUNO_TESTE.ALT_ALU',
        'ALUNO',
        'ALUNO.ALU_ID = ALUNO_TESTE.ALT_ALU_ID',
      )
      .leftJoinAndMapMany(
        'ALUNO_TESTE.ANSWERS_TEST',
        StudentTestAnswer,
        'ANSWER',
        'ANSWER.ATR_ALT_ID = ALUNO_TESTE.ALT_ID AND ALUNO_TESTE.ALT_FINALIZADO = 1',
      )
      .leftJoin('ANSWER.questionTemplate', 'questionTemplate')
      .leftJoin('questionTemplate.TEG_MTI', 'TEG_MTI')
      .leftJoin('ALUNO.ALU_PEL', 'ALU_PEL')
      .where('ALUNO_TESTE.ALT_TES_ID = :testId', { testId })
      .andWhere('ALUNO_TESTE.ALT_ALU_ID IN (:...studentIds)', { studentIds })
      .getMany()
  }

  private async loadStudents(studentIds: number[]): Promise<Student[]> {
    if (!studentIds.length) return []
    return this.connection
      .getRepository(Student)
      .createQueryBuilder('Student')
      .leftJoinAndSelect('Student.ALU_PEL', 'ALU_PEL')
      .select(['Student.ALU_ID', 'ALU_PEL.PEL_ID'])
      .where('Student.ALU_ID IN (:...studentIds)', { studentIds })
      .getMany()
  }

  private recalculateSubject(
    reportSubject: ReportSubject,
    exam: Test,
    studentSubmissions: StudentTest[],
    totalStudents: number,
    ids: string[],
  ): ReportSubject {
    if (exam.TES_DIS.DIS_TIPO === SubjectTypeEnum.OBJETIVA) {
      let totalPresentStudents = 0
      const totalGrades = studentSubmissions.reduce(
        (prev: number, cur: StudentTest) => {
          if (!cur.ALT_FINALIZADO) return prev
          totalPresentStudents++

          const ANSWERS_TEST = cur?.ANSWERS_TEST?.filter(
            (arr, index, self) =>
              index ===
              self.findIndex(
                (t) =>
                  t?.questionTemplate?.TEG_ID === arr?.questionTemplate?.TEG_ID,
              ),
          )

          const ANSWERS_VALID = ANSWERS_TEST?.filter(
            (a) => !a?.questionTemplate?.TEG_ANULADA,
          )

          const totalCorrects =
            ANSWERS_VALID?.reduce(
              (acc: number, ans: StudentTestAnswer) =>
                isAnswerCorrect(ans) ? acc + 1 : acc,
              0,
            ) ?? 0

          return (
            prev +
            (ANSWERS_VALID?.length
              ? Math.round((totalCorrects / ANSWERS_VALID.length) * 100)
              : 0)
          )
        },
        0,
      )

      reportSubject.countTotalStudents = totalStudents
      reportSubject.countStudentsLaunched = studentSubmissions.length
      reportSubject.countPresentStudents = totalPresentStudents
      reportSubject.totalGradesStudents = totalGrades
      reportSubject.idStudents = ids
      return reportSubject
    }

    if (exam.TES_DIS.DIS_TIPO === SubjectTypeEnum.LEITURA) {
      const totals = {
        fluente: 0,
        nao_fluente: 0,
        frases: 0,
        palavras: 0,
        silabas: 0,
        nao_leitor: 0,
        nao_avaliado: 0,
        nao_informado: 0,
        totalLaunched: 0,
        totalPresent: 0,
      }

      for (const cur of studentSubmissions) {
        totals.totalLaunched++
        if (!cur.ALT_FINALIZADO || !cur.ANSWERS_TEST?.length) {
          totals.nao_avaliado += 1
          continue
        }
        totals.totalPresent++
        const answer = cur.ANSWERS_TEST[0]?.ATR_RESPOSTA
        if (answer && answer in totals) {
          ;(totals as Record<string, number>)[answer] += 1
        }
      }
      totals.nao_informado = totalStudents - totals.totalLaunched

      reportSubject.fluente = totals.fluente
      reportSubject.nao_fluente = totals.nao_fluente
      reportSubject.frases = totals.frases
      reportSubject.palavras = totals.palavras
      reportSubject.silabas = totals.silabas
      reportSubject.nao_leitor = totals.nao_leitor
      reportSubject.nao_avaliado = totals.nao_avaliado
      reportSubject.nao_informado = totals.nao_informado
      reportSubject.countTotalStudents = totalStudents
      reportSubject.countStudentsLaunched = totals.totalLaunched
      reportSubject.countPresentStudents = totals.totalPresent
      reportSubject.idStudents = ids
      return reportSubject
    }

    return reportSubject
  }

  private async deleteSubjectChildren(reportSubjectId: number): Promise<void> {
    const existingQuestions = await this.reportQuestionRepository.find({
      where: { reportSubject: { id: reportSubjectId } },
    })
    if (existingQuestions.length) {
      await this.reportQuestionRepository.remove(existingQuestions)
    }

    const existingRaces = await this.reportRaceRepository.find({
      where: { reportSubject: { id: reportSubjectId } },
    })
    if (existingRaces.length) {
      await this.reportRaceRepository.remove(existingRaces)
    }
  }

  private async deleteEditionChildrenForTest(
    reportEditionId: number,
    testId: number,
  ): Promise<void> {
    const descriptors = await this.reportDescriptorRepository.find({
      where: {
        report_edition: { id: reportEditionId },
        test: { TES_ID: testId },
      },
    })
    if (descriptors.length) {
      await this.reportDescriptorRepository.remove(descriptors)
    }

    const notEvaluated = await this.reportNotEvaluatedRepository.find({
      where: {
        reportEdition: { id: reportEditionId },
        test: { TES_ID: testId },
      },
    })
    if (notEvaluated.length) {
      await this.reportNotEvaluatedRepository.remove(notEvaluated)
    }
  }
}
