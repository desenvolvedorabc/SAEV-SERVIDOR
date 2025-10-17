import { Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { InjectConnection, InjectRepository } from '@nestjs/typeorm'
import * as Bluebird from 'bluebird'
import { TypeAssessmentEnum } from 'src/modules/assessment/model/enum/type-assessment.enum'
import { StudentTest } from 'src/modules/release-results/model/entities/student-test.entity'
import { StudentTestAnswer } from 'src/modules/release-results/model/entities/student-test-answer.entity'
import { ReportQuestion } from 'src/modules/reports/model/entities/report-question.entity'
import { ReportSubject } from 'src/modules/reports/model/entities/report-subject.entity'
import { SubjectTypeEnum } from 'src/modules/subject/model/enum/subject-type.enum'
import { Test } from 'src/modules/test/model/entities/test.entity'
import { TestTemplate } from 'src/modules/test/model/entities/test-template.entity'
import { Connection, Repository } from 'typeorm'

import { options } from '../constants/options'
import { JobQuestionRepository } from './repositories/job-question.repository'

@Injectable()
export class JobQuestionService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,

    @InjectRepository(ReportQuestion)
    private readonly reportQuestionRepository: Repository<ReportQuestion>,

    private readonly jobQuestionRepository: JobQuestionRepository,
  ) {}

  async retroativo(
    assessmentId: number,
    countyId: number,
    type: TypeAssessmentEnum,
    concurrency: number,
  ) {
    const reportSubjects = await this.connection
      .getRepository(ReportSubject)
      .createQueryBuilder('ReportSubject')
      .select([
        'ReportSubject.id',
        'ReportSubject.idStudents',
        'reportEdition.id',
        'test.TES_ID',
        'TES_SER.SER_ID',
        'TES_DIS.DIS_ID',
        'TES_DIS.DIS_TIPO',
        'schoolClass.TUR_ID',
      ])
      .innerJoin('ReportSubject.reportEdition', 'reportEdition')
      .innerJoin('ReportSubject.test', 'test')
      .innerJoin('test.TES_SER', 'TES_SER')
      .innerJoin('test.TES_DIS', 'TES_DIS')
      .innerJoin('reportEdition.schoolClass', 'schoolClass')
      .where('reportEdition.editionAVAID = :assessmentId', { assessmentId })
      .andWhere('ReportSubject.countStudentsLaunched > 0')
      .andWhere('schoolClass.TUR_MUN = :countyId', { countyId })
      .andWhere('reportEdition.type = :typeAssessment', {
        typeAssessment: type,
      })
      .andWhere('TES_DIS.DIS_TIPO != :type', { type: SubjectTypeEnum.LEITURA })
      .getMany()

    await Bluebird.map(
      reportSubjects,
      async (reportSubject) => {
        if (reportSubject?.idStudents?.length) {
          const studentSubmissions = await this.connection
            .getRepository<StudentTest>(StudentTest)
            .createQueryBuilder('ALUNO_TESTE')
            .select([
              'ALUNO_TESTE.ALT_ID',
              'ALUNO.ALU_ID',
              'questionTemplate.TEG_ID',
            ])
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
            .where('ALUNO.ALU_ID IN(:...ids)', {
              ids: reportSubject.idStudents,
            })
            .andWhere('ALUNO_TESTE.ALT_TES_ID = :examId', {
              examId: reportSubject.test.TES_ID,
            })
            .getMany()

          await this.generateReportQuestionBySchoolClass({
            assessmentId,
            reportSubject,
            studentSubmissions,
            exam: reportSubject.test,
            schoolClassId: reportSubject?.reportEdition?.schoolClass.TUR_ID,
          })
        }
      },
      { concurrency },
    )
  }

  async getSubmissionsReading(examId: number, schoolClassId: number) {
    if (!examId) {
      return { studentSubmissionsReading: [] }
    }
    const studentSubmissionsReading = await this.connection
      .getRepository<StudentTest>(StudentTest)
      .createQueryBuilder('ALUNO_TESTE')
      .select(['ALUNO_TESTE.ALT_ID', 'ALUNO.ALU_ID', 'ANSWER.ATR_RESPOSTA'])
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
      .where('ALUNO_TESTE.schoolClass = :schoolClass', {
        schoolClass: schoolClassId,
      })
      .andWhere('ALUNO_TESTE.ALT_TES_ID = :examId', {
        examId,
      })
      .getMany()

    return {
      studentSubmissionsReading,
    }
  }

  @OnEvent('job-subject.created', { async: true })
  async generateReportQuestionBySchoolClass({
    assessmentId,
    reportSubject,
    studentSubmissions,
    exam,
    schoolClassId,
  }: {
    assessmentId: number
    reportSubject: ReportSubject
    studentSubmissions: StudentTest[]
    exam: Test
    schoolClassId: number
  }) {
    if (exam.TES_DIS.DIS_TIPO !== SubjectTypeEnum.OBJETIVA) {
      return
    }

    if (!studentSubmissions?.length) {
      return
    }

    const { testTemplate } = await this.getTemplateTest(exam.TES_ID)
    const { testReading } = await this.getTestReading(
      assessmentId,
      exam.TES_SER.SER_ID,
    )
    const { studentSubmissionsReading } = await this.getSubmissionsReading(
      testReading?.TES_ID,
      schoolClassId,
    )

    await Promise.all(
      testTemplate?.map(async (question) => {
        const data = {
          A: 0,
          B: 0,
          C: 0,
          D: 0,
          '-': 0,
          fluente: 0,
          nao_fluente: 0,
          frases: 0,
          palavras: 0,
          silabas: 0,
          nao_leitor: 0,
          nao_avaliado: 0,
          nao_informado: 0,
        }

        options.forEach((option) => {
          let totalCorrect = 0

          for (const submission of studentSubmissions) {
            const findQuestion = submission?.ANSWERS_TEST?.find(
              (answer) => answer?.questionTemplate?.TEG_ID === question?.TEG_ID,
            )

            if (findQuestion?.ATR_RESPOSTA?.toUpperCase() === option) {
              totalCorrect += 1
            }

            if (
              findQuestion?.ATR_RESPOSTA?.toUpperCase() === option &&
              option === question.TEG_RESPOSTA_CORRETA
            ) {
              const submissionReading = studentSubmissionsReading?.find(
                (s) => s.ALT_ALU.ALU_ID === submission.ALT_ALU.ALU_ID,
              )

              const level = this.getLevelLeituraByStudent(submissionReading)

              data[level] += 1
            }
          }

          data[option] = totalCorrect
        })

        const reportQuestion = this.reportQuestionRepository.create({
          question,
          reportSubject,
          option_correct: question?.TEG_RESPOSTA_CORRETA,
          total_a: data.A,
          total_b: data.B,
          total_c: data.C,
          total_d: data.D,
          total_null: data['-'],
          ...data,
        })

        await this.reportQuestionRepository.save(reportQuestion)
      }),
    )
  }

  async generateBySchool(
    schoolId: number,
    testId: number,
    reportSubjectId: any,
    type: TypeAssessmentEnum,
  ) {
    const reportQuestions = await this.jobQuestionRepository.generateBySchool(
      schoolId,
      testId,
      type,
    )

    await Promise.all(
      reportQuestions.map(async (rollupReportQuestion) => {
        const reportQuestion = this.reportQuestionRepository.create({
          option_correct: rollupReportQuestion.option_correct,
          total_a: rollupReportQuestion.total_a,
          total_b: rollupReportQuestion.total_b,
          total_c: rollupReportQuestion.total_c,
          total_d: rollupReportQuestion.total_d,
          total_null: rollupReportQuestion.total_null,
          fluente: rollupReportQuestion.fluente,
          nao_fluente: rollupReportQuestion.nao_fluente,
          frases: rollupReportQuestion.frases,
          palavras: rollupReportQuestion.palavras,
          silabas: rollupReportQuestion.silabas,
          nao_leitor: rollupReportQuestion.nao_leitor,
          nao_avaliado: rollupReportQuestion.nao_avaliado,
          nao_informado: rollupReportQuestion.nao_informado,
          reportSubject: reportSubjectId,
          question: rollupReportQuestion.questionId,
        })

        await this.reportQuestionRepository.save(reportQuestion)
      }),
    )
  }

  async generateByMunicipalityRegional(
    regionalId: number,
    testId: number,
    reportSubjectId: any,
    type: TypeAssessmentEnum,
  ) {
    const reportQuestions =
      await this.jobQuestionRepository.generateByMunicipalityRegional(
        regionalId,
        testId,
        type,
      )

    await Promise.all(
      reportQuestions.map(async (rollupReportQuestion) => {
        const reportQuestion = this.reportQuestionRepository.create({
          option_correct: rollupReportQuestion.option_correct,
          total_a: rollupReportQuestion.total_a,
          total_b: rollupReportQuestion.total_b,
          total_c: rollupReportQuestion.total_c,
          total_d: rollupReportQuestion.total_d,
          total_null: rollupReportQuestion.total_null,
          fluente: rollupReportQuestion.fluente,
          nao_fluente: rollupReportQuestion.nao_fluente,
          frases: rollupReportQuestion.frases,
          palavras: rollupReportQuestion.palavras,
          silabas: rollupReportQuestion.silabas,
          nao_leitor: rollupReportQuestion.nao_leitor,
          nao_avaliado: rollupReportQuestion.nao_avaliado,
          nao_informado: rollupReportQuestion.nao_informado,
          reportSubject: reportSubjectId,
          question: rollupReportQuestion.questionId,
        })

        await this.reportQuestionRepository.save(reportQuestion)
      }),
    )
  }

  async generateByCounty(
    countyId: number,
    testId: number,
    reportSubjectId: any,
    type: TypeAssessmentEnum,
  ) {
    const reportQuestions = await this.jobQuestionRepository.generateByCounty(
      countyId,
      testId,
      type,
    )

    await Promise.all(
      reportQuestions.map(async (rollupReportQuestion) => {
        const reportQuestion = this.reportQuestionRepository.create({
          option_correct: rollupReportQuestion.option_correct,
          total_a: rollupReportQuestion.total_a,
          total_b: rollupReportQuestion.total_b,
          total_c: rollupReportQuestion.total_c,
          total_d: rollupReportQuestion.total_d,
          total_null: rollupReportQuestion.total_null,
          fluente: rollupReportQuestion.fluente,
          nao_fluente: rollupReportQuestion.nao_fluente,
          frases: rollupReportQuestion.frases,
          palavras: rollupReportQuestion.palavras,
          silabas: rollupReportQuestion.silabas,
          nao_leitor: rollupReportQuestion.nao_leitor,
          nao_avaliado: rollupReportQuestion.nao_avaliado,
          nao_informado: rollupReportQuestion.nao_informado,
          reportSubject: reportSubjectId,
          question: rollupReportQuestion.questionId,
        })

        await this.reportQuestionRepository.save(reportQuestion)
      }),
    )
  }

  private async getTemplateTest(testId: number) {
    const testTemplate = await this.connection
      .getRepository(TestTemplate)
      .find({
        where: {
          TEG_TES: {
            TES_ID: testId,
          },
        },
        select: ['TEG_ID', 'TEG_RESPOSTA_CORRETA'],
      })

    return {
      testTemplate,
    }
  }

  async getTestReading(assessmentId: number, serieId: number) {
    const testReading = await this.connection
      .getRepository(Test)
      .createQueryBuilder('Test')
      .select(['Test.TES_ID'])
      .innerJoin('Test.TES_ASSESMENTS', 'TES_ASSESMENTS')
      .innerJoin('Test.TES_DIS', 'TES_DIS', 'TES_DIS.DIS_TIPO = :type', {
        type: SubjectTypeEnum.LEITURA,
      })
      .innerJoin('Test.TES_SER', 'TES_SER', 'TES_SER.SER_ID = :serie', {
        serie: serieId,
      })
      .where('TES_ASSESMENTS.AVA_ID = :assessmentId', { assessmentId })
      .getOne()

    return {
      testReading,
    }
  }

  private getLevelLeituraByStudent(submission: StudentTest) {
    if (!submission) {
      return 'nao_informado'
    }

    if (!submission.ANSWERS_TEST.length) {
      return 'nao_avaliado'
    }

    return submission?.ANSWERS_TEST[submission?.ANSWERS_TEST.length - 1]
      .ATR_RESPOSTA
  }
}
