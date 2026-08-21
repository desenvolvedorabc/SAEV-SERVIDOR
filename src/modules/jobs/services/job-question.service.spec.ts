import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { TypeAssessmentEnum } from 'src/modules/assessment/model/enum/type-assessment.enum'
import { ReportQuestion } from 'src/modules/reports/model/entities/report-question.entity'
import { ReportSubject } from 'src/modules/reports/model/entities/report-subject.entity'
import { SubjectTypeEnum } from 'src/modules/subject/model/enum/subject-type.enum'
import { Repository } from 'typeorm'

import { JobQuestionService } from './job-question.service'
import { JobQuestionRepository } from './repositories/job-question.repository'

type MockRepo<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>
const mockRepo = <T = any>(): MockRepo<T> => ({
  create: jest.fn().mockReturnValue({}),
  save: jest.fn().mockResolvedValue({}),
})

const makeQuestionRow = (overrides = {}) => ({
  option_correct: 'A',
  total_a: 5,
  total_b: 2,
  total_c: 1,
  total_d: 0,
  total_null: 0,
  fluente: 0,
  nao_fluente: 0,
  frases: 0,
  palavras: 0,
  silabas: 0,
  nao_leitor: 0,
  nao_avaliado: 0,
  nao_informado: 0,
  questionId: 1,
  ...overrides,
})

describe('JobQuestionService', () => {
  let service: JobQuestionService
  let reportQuestionRepository: MockRepo<ReportQuestion>
  let jobQuestionRepository: {
    generateBySchool: jest.Mock
    generateByMunicipalityRegional: jest.Mock
    generateByCounty: jest.Mock
  }
  let connection: { getRepository: jest.Mock }

  beforeEach(async () => {
    reportQuestionRepository = mockRepo()
    jobQuestionRepository = {
      generateBySchool: jest.fn().mockResolvedValue([]),
      generateByMunicipalityRegional: jest.fn().mockResolvedValue([]),
      generateByCounty: jest.fn().mockResolvedValue([]),
    }
    connection = { getRepository: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobQuestionService,
        { provide: 'Connection', useValue: connection },
        {
          provide: getRepositoryToken(ReportQuestion),
          useValue: reportQuestionRepository,
        },
        { provide: JobQuestionRepository, useValue: jobQuestionRepository },
      ],
    }).compile()

    service = module.get<JobQuestionService>(JobQuestionService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('generateBySchool', () => {
    it('não salva nada quando repositório retorna vazio', async () => {
      await service.generateBySchool(
        20,
        42,
        { id: 1 } as ReportSubject,
        TypeAssessmentEnum.MUNICIPAL,
      )

      expect(reportQuestionRepository.save).not.toHaveBeenCalled()
    })

    it('cria e salva um ReportQuestion por linha retornada', async () => {
      jobQuestionRepository.generateBySchool.mockResolvedValue([
        makeQuestionRow({ questionId: 1 }),
        makeQuestionRow({ questionId: 2 }),
      ])

      await service.generateBySchool(
        20,
        42,
        { id: 1 } as ReportSubject,
        TypeAssessmentEnum.MUNICIPAL,
      )

      expect(reportQuestionRepository.save).toHaveBeenCalledTimes(2)
    })

    it('mapeia todos os campos de totais para o ReportQuestion', async () => {
      jobQuestionRepository.generateBySchool.mockResolvedValue([
        makeQuestionRow({
          total_a: 10,
          total_b: 5,
          total_c: 3,
          total_d: 2,
          total_null: 1,
          option_correct: 'B',
        }),
      ])

      await service.generateBySchool(
        20,
        42,
        { id: 77 } as ReportSubject,
        TypeAssessmentEnum.MUNICIPAL,
      )

      const created = reportQuestionRepository.create.mock.calls[0][0]
      expect(created.total_a).toBe(10)
      expect(created.total_b).toBe(5)
      expect(created.total_null).toBe(1)
      expect(created.option_correct).toBe('B')
    })
  })

  describe('generateByMunicipalityRegional', () => {
    it('não salva nada quando repositório retorna vazio', async () => {
      await service.generateByMunicipalityRegional(
        30,
        42,
        { id: 1 } as ReportSubject,
        TypeAssessmentEnum.MUNICIPAL,
      )

      expect(reportQuestionRepository.save).not.toHaveBeenCalled()
    })

    it('cria e salva um ReportQuestion por linha retornada', async () => {
      jobQuestionRepository.generateByMunicipalityRegional.mockResolvedValue([
        makeQuestionRow({ questionId: 5 }),
      ])

      await service.generateByMunicipalityRegional(
        30,
        42,
        { id: 1 } as ReportSubject,
        TypeAssessmentEnum.MUNICIPAL,
      )

      expect(reportQuestionRepository.save).toHaveBeenCalledTimes(1)
    })
  })

  describe('generateByCounty', () => {
    it('não salva nada quando repositório retorna vazio', async () => {
      await service.generateByCounty(
        10,
        42,
        { id: 1 } as ReportSubject,
        TypeAssessmentEnum.MUNICIPAL,
      )

      expect(reportQuestionRepository.save).not.toHaveBeenCalled()
    })

    it('cria e salva um ReportQuestion por linha retornada', async () => {
      jobQuestionRepository.generateByCounty.mockResolvedValue([
        makeQuestionRow({ questionId: 3 }),
        makeQuestionRow({ questionId: 4 }),
        makeQuestionRow({ questionId: 5 }),
      ])

      await service.generateByCounty(
        10,
        42,
        { id: 1 } as ReportSubject,
        TypeAssessmentEnum.MUNICIPAL,
      )

      expect(reportQuestionRepository.save).toHaveBeenCalledTimes(3)
    })
  })

  describe('generateReportQuestionBySchoolClass', () => {
    const makeTemplate = (tegId: number, gabarito: string) => ({
      TEG_ID: tegId,
      TEG_RESPOSTA_CORRETA: gabarito,
      TEG_ANULADA: false,
    })

    const makeAnswer = (tegId: number, resposta: string) => ({
      ATR_RESPOSTA: resposta,
      questionTemplate: { TEG_ID: tegId },
      ALT_ALU: { ALU_ID: 1 },
    })

    const makeSubmission = (aluId: number, answers: any[]) => ({
      ALT_FINALIZADO: 1,
      ALT_ALU: { ALU_ID: aluId },
      ANSWERS_TEST: answers,
    })

    const makeExam = (tipo: string) =>
      ({
        TES_ID: 42,
        TES_DIS: { DIS_TIPO: tipo, DIS_ID: 1 },
        TES_SER: { SER_ID: 1 },
      }) as any

    const makeQBTemplates = (templates: any[]) => ({
      find: jest.fn().mockResolvedValue(templates),
    })

    const makeQBReadingTest = (result: any) => ({
      select: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(result),
    })

    const makeQBSubmissionsReading = (results: any[]) => ({
      select: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoinAndMapMany: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(results),
    })

    it('retorna sem salvar quando tipo não é OBJETIVA', async () => {
      await service.generateReportQuestionBySchoolClass({
        assessmentId: 1,
        reportSubject: { id: 1 } as ReportSubject,
        studentSubmissions: [makeSubmission(10, []) as any],
        exam: makeExam(SubjectTypeEnum.LEITURA),
        schoolClassId: 5,
      })

      expect(reportQuestionRepository.save).not.toHaveBeenCalled()
    })

    it('retorna sem salvar quando não há submissions', async () => {
      await service.generateReportQuestionBySchoolClass({
        assessmentId: 1,
        reportSubject: { id: 1 } as ReportSubject,
        studentSubmissions: [],
        exam: makeExam(SubjectTypeEnum.OBJETIVA),
        schoolClassId: 5,
      })

      expect(reportQuestionRepository.save).not.toHaveBeenCalled()
    })

    it('OBJETIVA: conta respostas por opção para cada questão', async () => {
      const exam = makeExam(SubjectTypeEnum.OBJETIVA)

      connection.getRepository
        .mockReturnValueOnce(makeQBTemplates([makeTemplate(1, 'A')])) // getTemplateTest
        .mockReturnValueOnce({
          createQueryBuilder: jest
            .fn()
            .mockReturnValue(makeQBReadingTest(null)),
        }) // getTestReading
        .mockReturnValueOnce({
          createQueryBuilder: jest
            .fn()
            .mockReturnValue(makeQBSubmissionsReading([])),
        }) // getSubmissionsReading

      const submissions = [
        makeSubmission(10, [makeAnswer(1, 'A')]),
        makeSubmission(11, [makeAnswer(1, 'B')]),
        makeSubmission(12, [makeAnswer(1, 'A')]),
      ]

      await service.generateReportQuestionBySchoolClass({
        assessmentId: 1,
        reportSubject: { id: 1 } as ReportSubject,
        studentSubmissions: submissions as any,
        exam,
        schoolClassId: 5,
      })

      expect(reportQuestionRepository.save).toHaveBeenCalledTimes(1)
      const created = reportQuestionRepository.create.mock.calls[0][0]
      expect(created.total_a).toBe(2)
      expect(created.total_b).toBe(1)
      expect(created.option_correct).toBe('A')
    })

    it('OBJETIVA: salva um ReportQuestion por template de questão', async () => {
      const exam = makeExam(SubjectTypeEnum.OBJETIVA)

      connection.getRepository
        .mockReturnValueOnce(
          makeQBTemplates([makeTemplate(1, 'A'), makeTemplate(2, 'B')]),
        )
        .mockReturnValueOnce({
          createQueryBuilder: jest
            .fn()
            .mockReturnValue(makeQBReadingTest(null)),
        })
        .mockReturnValueOnce({
          createQueryBuilder: jest
            .fn()
            .mockReturnValue(makeQBSubmissionsReading([])),
        })

      const submissions = [
        makeSubmission(10, [makeAnswer(1, 'A'), makeAnswer(2, 'B')]),
      ]

      await service.generateReportQuestionBySchoolClass({
        assessmentId: 1,
        reportSubject: { id: 1 } as ReportSubject,
        studentSubmissions: submissions as any,
        exam,
        schoolClassId: 5,
      })

      expect(reportQuestionRepository.save).toHaveBeenCalledTimes(2)
    })
  })

  describe('getLevelLeituraByStudent (via generateReportQuestionBySchoolClass)', () => {
    const makeExam = () =>
      ({
        TES_ID: 42,
        TES_DIS: { DIS_TIPO: SubjectTypeEnum.OBJETIVA, DIS_ID: 1 },
        TES_SER: { SER_ID: 1 },
      }) as any

    it('classifica como nao_informado quando aluno não tem submission de leitura', async () => {
      connection.getRepository
        .mockReturnValueOnce({
          find: jest
            .fn()
            .mockResolvedValue([
              { TEG_ID: 1, TEG_RESPOSTA_CORRETA: 'A', TEG_ANULADA: false },
            ]),
        })
        .mockReturnValueOnce({
          createQueryBuilder: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            innerJoin: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue({ TES_ID: 10 }),
          }),
        })
        .mockReturnValueOnce({
          createQueryBuilder: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            innerJoin: jest.fn().mockReturnThis(),
            leftJoinAndMapMany: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
          }),
        }) // no reading submission for ALU_ID 10

      const submissions = [
        {
          ALT_FINALIZADO: 1,
          ALT_ALU: { ALU_ID: 10 },
          ANSWERS_TEST: [
            { ATR_RESPOSTA: 'A', questionTemplate: { TEG_ID: 1 } },
          ],
        },
      ]

      await service.generateReportQuestionBySchoolClass({
        assessmentId: 1,
        reportSubject: { id: 1 } as ReportSubject,
        studentSubmissions: submissions as any,
        exam: makeExam(),
        schoolClassId: 5,
      })

      const created = reportQuestionRepository.create.mock.calls[0][0]
      expect(created.nao_informado).toBe(1) // acertou mas sem leitura → nao_informado
    })
  })
})
