import { Injectable } from '@nestjs/common'
import { InjectConnection, InjectRepository } from '@nestjs/typeorm'
import * as Bluebird from 'bluebird'
import { sendEmail } from 'src/helpers/sendMail'
import { SchoolClass } from 'src/modules/school-class/model/entities/school-class.entity'
import { Student } from 'src/modules/student/model/entities/student.entity'
import { Connection, Repository } from 'typeorm'

import { Assessment } from '../assessment/model/entities/assessment.entity'
import { AssessmentCounty } from '../assessment/model/entities/assessment-county.entity'
import { TypeAssessmentEnum } from '../assessment/model/enum/type-assessment.enum'
import { Regional } from '../regional/model/entities/regional.entity'
import { StudentTest } from '../release-results/model/entities/student-test.entity'
import { StudentTestAnswer } from '../release-results/model/entities/student-test-answer.entity'
import { ReportEdition } from '../reports/model/entities/report-edition.entity'
import { ReportSubject } from '../reports/model/entities/report-subject.entity'
import { ReportsService } from '../reports/service/reports.service'
import { SubjectTypeEnum } from '../subject/model/enum/subject.enum'
import { Test } from '../test/model/entities/test.entity'
import { StartJobWithFiltersDto } from './dto/start-job-with-filters.dto'
import { Job as SAEVJob } from './job.entity'
import { JobType } from './job-type.enum'
import { JobDescriptorsService } from './services/job-descriptor.service'
import { JobNotEvaluatedService } from './services/job-not-evaluated.service'
import { JobQuestionService } from './services/job-question.service'
import { JobRaceService } from './services/job-race.service'
import { JobSubjectService } from './services/job-subject.service'

@Injectable()
export class JobsService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,

    @InjectRepository(ReportSubject)
    private readonly reportSubjectsRepository: Repository<ReportSubject>,

    @InjectRepository(SAEVJob)
    private readonly jobsRepository: Repository<SAEVJob>,

    private readonly reportsService: ReportsService,
    private readonly jobSubjectService: JobSubjectService,
    private readonly jobNotEvaluatedService: JobNotEvaluatedService,
    private readonly jobRaceService: JobRaceService,
    private readonly jobDescriptorsService: JobDescriptorsService,
    private readonly jobQuestionService: JobQuestionService,
  ) {}

  async startJobWithFilters({
    assessmentId,
    countyId,
    stateId,
    concurrency,
  }: StartJobWithFiltersDto) {
    const jobHistory = this.jobsRepository.create({
      bullId: '',
      assessmentId,
      countyId,
      jobType: JobType.JOB_FULL,
      startDate: new Date(),
    })
    const newJobHistory = await this.jobsRepository.save(jobHistory)
    const queryBuilder = this.connection
      .getRepository(Assessment)
      .createQueryBuilder('Assessment')
      .select([
        'Assessment.AVA_ID',
        'Assessment.AVA_ANO',
        'Assessment.AVA_NOME',
        'AVA_AVM.AVM_ID',
        'AVA_AVM.AVM_TIPO',
        'AVM_MUN.MUN_ID',
        'AVM_MUN.stateId',
      ])
      .innerJoin('Assessment.AVA_AVM', 'AVA_AVM')
      .innerJoin('AVA_AVM.AVM_MUN', 'AVM_MUN')
      .where('Assessment.AVA_ID = :assessmentId', {
        assessmentId,
      })
    if (stateId) {
      queryBuilder.andWhere('AVM_MUN.stateId = :stateId', { stateId })
    }
    if (countyId) {
      queryBuilder.andWhere('AVM_MUN.MUN_ID = :countyId', { countyId })
    }
    const editions = await queryBuilder.getMany()

    try {
      for await (const edition of editions) {
        await Bluebird.map(
          edition.AVA_AVM,
          async (assessmentCounty) => {
            await this.generateReportEditionsBySchool(
              edition.AVA_ID,
              assessmentCounty.AVM_MUN.MUN_ID,
              assessmentCounty.AVM_TIPO,
            )
            await this.generateReportEditionsByMunicipalityRegional(
              edition.AVA_ID,
              assessmentCounty.AVM_MUN.MUN_ID,
              assessmentCounty.AVM_TIPO,
            )
            await this.generateReportEditionsByCounty(
              edition.AVA_ID,
              assessmentCounty.AVM_MUN.MUN_ID,
              assessmentCounty.AVM_TIPO,
            )
          },
          { concurrency },
        )
      }

      newJobHistory.endDate = new Date()
      await this.jobsRepository.save(newJobHistory)
    } catch (e) {
      newJobHistory.bullId = 'ERROR'
      await this.jobsRepository.save(newJobHistory)
      await sendEmail(
        'carlos.nunes@going2.com.br',
        'Saev | Houve uma falha no JOB',
        `${e}`,
      )
    }
  }

  async startJob() {
    const jobHistory = this.jobsRepository.create({
      bullId: '',
      assessmentId: 0,
      countyId: 0,
      jobType: JobType.JOB_FULL,
      startDate: new Date(),
    })

    const newJobHistory = await this.jobsRepository.save(jobHistory)

    const finalDate = new Date()
    let day = finalDate.getDate()
    day = day - 1
    finalDate.setDate(day)

    const editions = await this.connection
      .getRepository(Assessment)
      .createQueryBuilder('Assessment')
      .select([
        'Assessment.AVA_ID',
        'Assessment.AVA_ANO',
        'AVA_AVM.AVM_ID',
        'AVA_AVM.AVM_TIPO',
        'AVM_MUN.MUN_ID',
        'AVM_MUN.stateId',
      ])
      .innerJoin(
        'Assessment.AVA_AVM',
        'AVA_AVM',
        'AVA_AVM.AVM_DT_INICIO <= :initialDate AND DATE_SUB(AVA_AVM.AVM_DT_FIM, INTERVAL 3 HOUR) >= :finalDate',
        { initialDate: new Date(), finalDate },
      )
      .innerJoin('AVA_AVM.AVM_MUN', 'AVM_MUN')
      .getMany()
    try {
      for (const edition of editions) {
        await Bluebird.map(
          edition.AVA_AVM,
          async (assessmentCounty) => {
            await this.generateReportEditionsBySchoolClasses(
              edition,
              assessmentCounty,
            )

            await this.generateReportEditionsBySchool(
              edition.AVA_ID,
              assessmentCounty.AVM_MUN.MUN_ID,
              assessmentCounty.AVM_TIPO,
            )
            await this.generateReportEditionsByMunicipalityRegional(
              edition.AVA_ID,
              assessmentCounty.AVM_MUN.MUN_ID,
              assessmentCounty.AVM_TIPO,
            )
            await this.generateReportEditionsByCounty(
              edition.AVA_ID,
              assessmentCounty.AVM_MUN.MUN_ID,
              assessmentCounty.AVM_TIPO,
            )
          },
          { concurrency: 5 },
        )
      }

      newJobHistory.endDate = new Date()
      await this.jobsRepository.save(newJobHistory)
    } catch (e) {
      newJobHistory.bullId = 'ERROR'
      await this.jobsRepository.save(newJobHistory)

      await sendEmail(
        'carlos.nunes@going2.com.br',
        'Saev | Houve uma falha no JOB',
        `${e}`,
      )
    }
  }

  async generateReportEditionsByCounty(
    assessmentId: number,
    countyId: number,
    type: TypeAssessmentEnum,
  ) {
    await this.reportsService.upsertReportEditionByAssessmentId(
      assessmentId,
      { county: { MUN_ID: countyId }, type },
      ['reportsSubjects', 'reports_descriptors', 'reports_not_evaluated'],
    )

    await this.jobSubjectService.generateByCounty(assessmentId, countyId, type)
    await this.jobDescriptorsService.generateByCounty(
      assessmentId,
      countyId,
      type,
    )
    await this.jobNotEvaluatedService.generateByCounty(
      assessmentId,
      countyId,
      type,
    )
  }

  async generateReportEditionsBySchool(
    assessmentId: number,
    countyId: number,
    type: TypeAssessmentEnum,
  ) {
    await this.jobSubjectService.generateBySchool(assessmentId, countyId, type)
    await this.jobDescriptorsService.generateBySchool(
      assessmentId,
      countyId,
      type,
    )
    await this.jobNotEvaluatedService.generateBySchool(
      assessmentId,
      countyId,
      type,
    )
  }

  async deleteReportEditionsRegional(
    assessmentId: number,
    countyId: number,
    type: TypeAssessmentEnum,
  ) {
    const regionals = await this.connection
      .getRepository(Regional)
      .createQueryBuilder('Regionals')
      .select(['Regionals.id'])
      .where('Regionals.countyId = :countyId', { countyId })
      .getMany()

    await Promise.all(
      regionals.map(async (regional) => {
        await this.reportsService.upsertReportEditionByAssessmentId(
          assessmentId,
          { regionalId: regional.id, type },
          ['reportsSubjects', 'reports_descriptors', 'reports_not_evaluated'],
        )
      }),
    )
  }

  async generateReportEditionsByMunicipalityRegional(
    assessmentId: number,
    countyId: number,
    type: TypeAssessmentEnum,
  ) {
    await this.deleteReportEditionsRegional(assessmentId, countyId, type)

    await this.jobSubjectService.generateByMunicipalityRegional(
      assessmentId,
      countyId,
      type,
    )
    await this.jobDescriptorsService.generateByMunicipalityRegional(
      assessmentId,
      countyId,
      type,
    )
    await this.jobNotEvaluatedService.generateByMunicipalityRegional(
      assessmentId,
      countyId,
      type,
    )
  }

  async generateReportEditionsBySchoolClasses(
    assessment: Assessment,
    assessmentCounty: AssessmentCounty,
  ) {
    const schoolClasses = await this.getSchoolClassesByAssessmentId(
      assessment,
      assessmentCounty,
    )

    const exams = await this.getExamsByAssessmentId(assessment.AVA_ID)

    for await (const schoolClass of schoolClasses) {
      const reportEdition =
        await this.reportsService.upsertReportEditionByAssessmentId(
          assessment.AVA_ID,
          {
            schoolClass: { TUR_ID: schoolClass.TUR_ID },
            type: assessmentCounty.AVM_TIPO,
          },
        )

      const students = await this.connection
        .getRepository(Student)
        .createQueryBuilder('Student')
        .leftJoin('Student.ALU_PEL', 'ALU_PEL')
        .select(['Student.ALU_ID', 'ALU_PEL.PEL_ID'])
        .where('Student.ALU_TUR = :schoolClass', {
          schoolClass: schoolClass.TUR_ID,
        })
        .andWhere('Student.ALU_ATIVO = true')
        .getMany()

      for await (const exam of exams) {
        await this.generateReportSubjectBySchoolClass(
          assessment.AVA_ID,
          schoolClass,
          exam,
          reportEdition,
          students,
        )
      }
    }
  }

  private async getSchoolClassesByAssessmentId(
    assessment: Assessment,
    assessmentCounty: AssessmentCounty,
  ): Promise<SchoolClass[]> {
    return this.connection
      .getRepository<SchoolClass>(SchoolClass)
      .createQueryBuilder('TURMA')
      .select(['TURMA.TUR_ID', 'TURMA.TUR_ANO', 'SERIE.SER_ID'])
      .innerJoin('TURMA.TUR_ESC', 'ESCOLA', 'TURMA.TUR_ESC_ID = ESCOLA.ESC_ID')
      .innerJoin('TURMA.TUR_SER', 'SERIE', 'TURMA.TUR_SER_ID = SERIE.SER_ID')
      .where('TURMA.TUR_ANO = :year', {
        year: assessment.AVA_ANO,
      })
      .andWhere('ESCOLA.ESC_MUN = :countyId', {
        countyId: assessmentCounty?.AVM_MUN?.MUN_ID,
      })
      .andWhere('ESCOLA.ESC_TIPO = :type', {
        type: assessmentCounty?.AVM_TIPO,
      })
      .getMany()
  }

  async getExamsByAssessmentId(assessmentId: number) {
    return await this.connection
      .getRepository<Test>(Test)
      .createQueryBuilder('TESTE')
      .select([
        'TESTE.TES_ID',
        'TESTE.TES_ANO',
        'SERIE.SER_ID',
        'TES_DIS.DIS_ID',
        'TES_DIS.DIS_NOME',
        'TES_DIS.DIS_TIPO',
      ])
      .innerJoin(
        'avaliacao_teste',
        'AVALIACAO_TESTE',
        'AVALIACAO_TESTE.AVA_ID = :assessmentId AND AVALIACAO_TESTE.TES_ID = TESTE.TES_ID',
        { assessmentId },
      )
      .innerJoin('TESTE.TES_SER', 'SERIE', 'TESTE.TES_SER_ID = SERIE.SER_ID')
      .innerJoin('TESTE.TES_DIS', 'TES_DIS')
      .getMany()
  }

  private async generateReportSubjectBySchoolClass(
    assessmentId: number,
    schoolClass: SchoolClass,
    exam: Test,
    reportEdition: ReportEdition,
    studentsCurrent: Student[],
  ) {
    if (
      schoolClass.TUR_ANO !== exam.TES_ANO ||
      schoolClass.TUR_SER.SER_ID !== exam.TES_SER.SER_ID
    ) {
      return
    }

    const studentSubmissions = await this.connection
      .getRepository<StudentTest>(StudentTest)
      .createQueryBuilder('ALUNO_TESTE')
      .select([
        'ALUNO_TESTE',
        'ALUNO.ALU_ID',
        'ALU_PEL.PEL_ID',
        'questionTemplate.TEG_ID',
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
      .where('ALUNO_TESTE.ALT_TES_ID = :examId', { examId: exam.TES_ID })
      .andWhere('ALUNO_TESTE.schoolClass = :schoolClass', {
        schoolClass: schoolClass.TUR_ID,
      })
      .getMany()

    const totalStudentsCurrent = studentsCurrent?.length
    if (!totalStudentsCurrent && !studentSubmissions.length) {
      return
    }

    const filterStudents = studentsCurrent.filter(
      (item) =>
        !studentSubmissions.map((x) => x.ALT_ALU.ALU_ID).includes(item.ALU_ID),
    )
    const verifyIds = []

    for (const student of filterStudents) {
      const verify = await this.connection.getRepository(StudentTest).findOne({
        where: {
          ALT_ALU: {
            ALU_ID: student.ALU_ID,
          },
          ALT_TES: {
            TES_ID: exam.TES_ID,
          },
        },
      })

      if (!verify) {
        verifyIds.push(student)
      }
    }

    const totalStudents = studentSubmissions?.length + verifyIds.length

    const ids: string[] = []
    const allStudents = []

    studentSubmissions.forEach((item) => {
      ids.push(String(item.ALT_ALU.ALU_ID))
      allStudents.push(item.ALT_ALU)
    })

    verifyIds?.forEach((item) => {
      ids.push(String(item.ALU_ID))
      allStudents.push(item)
    })

    if (!totalStudents) {
      return
    }

    let reportSubject

    switch (exam.TES_DIS.DIS_TIPO) {
      case SubjectTypeEnum.OBJETIVA:
        {
          let totalPresentStudents = 0
          let totalGrades = 0

          totalGrades = studentSubmissions?.reduce(
            (prev: number, cur: StudentTest) => {
              if (!cur.ALT_FINALIZADO) {
                return prev
              }

              totalPresentStudents++

              const ANSWERS_TEST = cur?.ANSWERS_TEST?.filter(
                (arr, index, self) =>
                  index ===
                  self.findIndex(
                    (t) =>
                      t?.questionTemplate?.TEG_ID ===
                      arr?.questionTemplate?.TEG_ID,
                  ),
              )

              const totalCorrects = ANSWERS_TEST?.reduce(
                (prev: number, cur: StudentTestAnswer) => {
                  if (cur.ATR_CERTO) {
                    return prev + 1
                  }
                  return prev
                },
                0,
              )

              return (
                prev +
                (ANSWERS_TEST.length
                  ? Math.round((totalCorrects / ANSWERS_TEST.length) * 100)
                  : 0)
              )
            },
            0,
          )

          reportSubject = this.reportSubjectsRepository.create({
            type: SubjectTypeEnum.OBJETIVA,
            name: exam.TES_DIS.DIS_NOME,
            test: exam,
            countTotalStudents: totalStudents,
            countStudentsLaunched: studentSubmissions.length,
            countPresentStudents: totalPresentStudents,
            totalGradesStudents: totalGrades,
            reportEdition,
            idStudents: ids,
          })
        }
        break
      case SubjectTypeEnum.LEITURA:
        {
          let totalGrades = {
            leitura: {
              fluente: 0,
              nao_fluente: 0,
              frases: 0,
              palavras: 0,
              silabas: 0,
              nao_leitor: 0,
              nao_avaliado: 0,
              nao_informado: 0,
            },
            totalLaunched: 0,
            totalPresent: 0,
          }

          totalGrades = studentSubmissions?.reduce(
            (prev: any, cur: StudentTest) => {
              prev.totalLaunched++
              if (!cur.ALT_FINALIZADO || !cur.ANSWERS_TEST.length) {
                prev.leitura.nao_avaliado = prev.leitura.nao_avaliado + 1
                return prev
              }

              prev.totalPresent++

              prev.leitura[cur.ANSWERS_TEST[0].ATR_RESPOSTA] =
                prev.leitura[cur.ANSWERS_TEST[0].ATR_RESPOSTA] + 1
              return prev
            },
            totalGrades,
          )

          totalGrades.leitura.nao_informado =
            totalStudents - totalGrades.totalLaunched

          reportSubject = this.reportSubjectsRepository.create({
            ...totalGrades.leitura,
            type: SubjectTypeEnum.LEITURA,
            name: exam.TES_DIS.DIS_NOME,
            test: exam,
            countTotalStudents: totalStudents,
            countStudentsLaunched: totalGrades.totalLaunched,
            countPresentStudents: totalGrades.totalPresent,
            reportEdition,
            idStudents: ids,
          })
        }
        break
      default:
        return
    }

    await Promise.all([
      await this.reportSubjectsRepository.save(reportSubject),
      await this.jobNotEvaluatedService.generateBySchoolClass({
        totalStudents,
        exam,
        reportEdition,
        studentSubmissions,
        ids,
      }),

      await this.jobRaceService.generateReportRacesBySchoolClass({
        reportSubject,
        students: allStudents,
        studentSubmissions,
        exam,
      }),

      await this.jobDescriptorsService.generateReportDescriptorBySchoolClass({
        exam,
        reportEdition,
        studentSubmissions,
      }),

      await this.jobQuestionService.generateReportQuestionBySchoolClass({
        assessmentId,
        reportSubject,
        studentSubmissions,
        exam,
        schoolClassId: schoolClass?.TUR_ID,
      }),
    ])
  }
}
