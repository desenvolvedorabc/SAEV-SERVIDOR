import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { TypeAssessmentEnum } from 'src/modules/assessment/model/enum/type-assessment.enum'
import { ReportDescriptor } from 'src/modules/reports/model/entities/report-descriptor.entity'
import { ReportEdition } from 'src/modules/reports/model/entities/report-edition.entity'
import { ReportsService } from 'src/modules/reports/service/reports.service'
import { SubjectTypeEnum } from 'src/modules/subject/model/enum/subject-type.enum'
import { Repository } from 'typeorm'

import { JobDescriptorsService } from './job-descriptor.service'
import { JobDescriptorsRepository } from './repositories/job-descriptor.repository'

type MockRepo<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>
const mockRepo = <T = any>(): MockRepo<T> => ({
  create: jest.fn().mockReturnValue({}),
  save: jest.fn().mockResolvedValue({}),
})

const makeRow = (overrides = {}) => ({
  assessmentId: 1,
  MUN_ID: 10,
  ESC_ID: 20,
  regionalId: 30,
  testTESID: 42,
  total: 100,
  totalCorrect: 80,
  descriptorMTIID: 5,
  ...overrides,
})

describe('JobDescriptorsService', () => {
  let service: JobDescriptorsService
  let reportDescriptorRepository: MockRepo<ReportDescriptor>
  let reportsService: { upsertReportEditionByAssessmentId: jest.Mock }
  let jobDescriptorsRepository: {
    getMunicipalityRegionalByCounty: jest.Mock
    getReportEditionGroupedByTestAndSchoolClass: jest.Mock
    getReportEditionGroupedByMunicipalityRegional: jest.Mock
  }
  let connection: { getRepository: jest.Mock }

  beforeEach(async () => {
    reportDescriptorRepository = mockRepo()
    reportsService = {
      upsertReportEditionByAssessmentId: jest
        .fn()
        .mockResolvedValue({ id: 99 } as ReportEdition),
    }
    jobDescriptorsRepository = {
      getMunicipalityRegionalByCounty: jest.fn().mockResolvedValue([]),
      getReportEditionGroupedByTestAndSchoolClass: jest
        .fn()
        .mockResolvedValue([]),
      getReportEditionGroupedByMunicipalityRegional: jest
        .fn()
        .mockResolvedValue([]),
    }
    connection = { getRepository: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobDescriptorsService,
        { provide: 'Connection', useValue: connection },
        {
          provide: getRepositoryToken(ReportDescriptor),
          useValue: reportDescriptorRepository,
        },
        { provide: ReportsService, useValue: reportsService },
        {
          provide: JobDescriptorsRepository,
          useValue: jobDescriptorsRepository,
        },
      ],
    }).compile()

    service = module.get<JobDescriptorsService>(JobDescriptorsService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('generateByCounty', () => {
    it('não salva nada quando repositório retorna vazio', async () => {
      await service.generateByCounty(1, 10, TypeAssessmentEnum.MUNICIPAL)

      expect(reportDescriptorRepository.save).not.toHaveBeenCalled()
    })

    it('faz upsert de ReportEdition por município e salva ReportDescriptor por linha', async () => {
      jobDescriptorsRepository.getMunicipalityRegionalByCounty.mockResolvedValue(
        [makeRow({ testTESID: 42 }), makeRow({ testTESID: 55 })],
      )

      await service.generateByCounty(1, 10, TypeAssessmentEnum.MUNICIPAL)

      expect(
        reportsService.upsertReportEditionByAssessmentId,
      ).toHaveBeenCalledTimes(1)
      expect(reportDescriptorRepository.save).toHaveBeenCalledTimes(2)
    })

    it('gera um upsert por município distinto quando há dois grupos', async () => {
      jobDescriptorsRepository.getMunicipalityRegionalByCounty.mockResolvedValue(
        [
          makeRow({ MUN_ID: 10, testTESID: 42 }),
          makeRow({ MUN_ID: 20, testTESID: 42 }),
        ],
      )

      await service.generateByCounty(1, 10, TypeAssessmentEnum.MUNICIPAL)

      expect(
        reportsService.upsertReportEditionByAssessmentId,
      ).toHaveBeenCalledTimes(2)
    })

    it('passa total e totalCorrect corretos ao criar ReportDescriptor', async () => {
      jobDescriptorsRepository.getMunicipalityRegionalByCounty.mockResolvedValue(
        [makeRow({ total: 50, totalCorrect: 40, descriptorMTIID: 7 })],
      )

      await service.generateByCounty(1, 10, TypeAssessmentEnum.MUNICIPAL)

      const created = reportDescriptorRepository.create.mock.calls[0][0]
      expect(created.total).toBe(50)
      expect(created.totalCorrect).toBe(40)
      expect(created.descriptor).toBe(7)
    })
  })

  describe('generateBySchool', () => {
    it('não salva nada quando repositório retorna vazio', async () => {
      await service.generateBySchool(1, 10, TypeAssessmentEnum.MUNICIPAL)

      expect(reportDescriptorRepository.save).not.toHaveBeenCalled()
    })

    it('agrupa por escola e salva um ReportDescriptor por linha', async () => {
      jobDescriptorsRepository.getReportEditionGroupedByTestAndSchoolClass.mockResolvedValue(
        [
          makeRow({ ESC_ID: 20, testTESID: 42 }),
          makeRow({ ESC_ID: 20, testTESID: 55 }),
        ],
      )

      await service.generateBySchool(1, 10, TypeAssessmentEnum.MUNICIPAL)

      expect(
        reportsService.upsertReportEditionByAssessmentId,
      ).toHaveBeenCalledTimes(1)
      expect(reportDescriptorRepository.save).toHaveBeenCalledTimes(2)
    })

    it('gera um upsert por escola distinta', async () => {
      jobDescriptorsRepository.getReportEditionGroupedByTestAndSchoolClass.mockResolvedValue(
        [
          makeRow({ ESC_ID: 20, testTESID: 42 }),
          makeRow({ ESC_ID: 21, testTESID: 42 }),
        ],
      )

      await service.generateBySchool(1, 10, TypeAssessmentEnum.MUNICIPAL)

      expect(
        reportsService.upsertReportEditionByAssessmentId,
      ).toHaveBeenCalledTimes(2)
    })
  })

  describe('generateByMunicipalityRegional', () => {
    it('não salva nada quando repositório retorna vazio', async () => {
      await service.generateByMunicipalityRegional(
        1,
        10,
        TypeAssessmentEnum.MUNICIPAL,
      )

      expect(reportDescriptorRepository.save).not.toHaveBeenCalled()
    })

    it('agrupa por regional e faz upsert por grupo', async () => {
      jobDescriptorsRepository.getReportEditionGroupedByMunicipalityRegional.mockResolvedValue(
        [
          makeRow({ regionalId: 30, testTESID: 42 }),
          makeRow({ regionalId: 30, testTESID: 55 }),
          makeRow({ regionalId: 31, testTESID: 42 }),
        ],
      )

      await service.generateByMunicipalityRegional(
        1,
        10,
        TypeAssessmentEnum.MUNICIPAL,
      )

      expect(
        reportsService.upsertReportEditionByAssessmentId,
      ).toHaveBeenCalledTimes(2)
      expect(reportDescriptorRepository.save).toHaveBeenCalledTimes(3)
    })
  })

  describe('generateReportDescriptorBySchoolClass', () => {
    const makeDescriptor = (mtiId: number) => ({ MTI_ID: mtiId })

    const makeAnswer = (
      mtiId: number,
      resposta: string,
      gabarito: string,
      anulada = false,
    ) => ({
      ATR_RESPOSTA: resposta,
      questionTemplate: {
        TEG_ID: mtiId * 10,
        TEG_RESPOSTA_CORRETA: gabarito,
        TEG_ANULADA: anulada,
        TEG_MTI: { MTI_ID: mtiId },
      },
    })

    const makeSubmission = (answers: any[]) => ({
      ANSWERS_TEST: answers,
    })

    const makeExam = (tipo: string, disId = 1) =>
      ({
        TES_DIS: { DIS_TIPO: tipo, DIS_ID: disId },
      }) as any

    const makeQB = (descriptors: any[]) => ({
      select: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(descriptors),
    })

    it('retorna sem salvar quando tipo não é OBJETIVA', async () => {
      const exam = makeExam(SubjectTypeEnum.LEITURA)
      const submissions = [makeSubmission([makeAnswer(1, 'A', 'A')])]

      await service.generateReportDescriptorBySchoolClass({
        exam,
        reportEdition: { id: 1 } as ReportEdition,
        studentSubmissions: submissions as any,
      })

      expect(reportDescriptorRepository.save).not.toHaveBeenCalled()
    })

    it('retorna sem salvar quando não há submissions', async () => {
      const exam = makeExam(SubjectTypeEnum.OBJETIVA)
      connection.getRepository.mockReturnValue({
        createQueryBuilder: jest
          .fn()
          .mockReturnValue(makeQB([makeDescriptor(1)])),
      })

      await service.generateReportDescriptorBySchoolClass({
        exam,
        reportEdition: { id: 1 } as ReportEdition,
        studentSubmissions: [],
      })

      expect(reportDescriptorRepository.save).not.toHaveBeenCalled()
    })

    it('não salva descritor quando countTotal é zero', async () => {
      const exam = makeExam(SubjectTypeEnum.OBJETIVA)
      const descriptor = makeDescriptor(99) // MTI_ID 99 não aparece nas answers
      connection.getRepository.mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(makeQB([descriptor])),
      })

      const submissions = [makeSubmission([makeAnswer(1, 'A', 'A')])] // MTI_ID 1, não 99

      await service.generateReportDescriptorBySchoolClass({
        exam,
        reportEdition: { id: 1 } as ReportEdition,
        studentSubmissions: submissions as any,
      })

      expect(reportDescriptorRepository.save).not.toHaveBeenCalled()
    })

    it('OBJETIVA: conta total e totalCorrect por descritor corretamente', async () => {
      const exam = makeExam(SubjectTypeEnum.OBJETIVA)
      const descriptor = makeDescriptor(1)
      connection.getRepository.mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(makeQB([descriptor])),
      })

      const submissions = [
        makeSubmission([makeAnswer(1, 'A', 'A')]), // acertou
        makeSubmission([makeAnswer(1, 'B', 'A')]), // errou
        makeSubmission([makeAnswer(1, 'A', 'A')]), // acertou
      ]

      await service.generateReportDescriptorBySchoolClass({
        exam,
        reportEdition: { id: 5 } as ReportEdition,
        studentSubmissions: submissions as any,
      })

      expect(reportDescriptorRepository.save).toHaveBeenCalledTimes(1)
      const created = reportDescriptorRepository.create.mock.calls[0][0]
      expect(created.total).toBe(3)
      expect(created.totalCorrect).toBe(2)
    })

    it('exclui questões anuladas do cálculo', async () => {
      const exam = makeExam(SubjectTypeEnum.OBJETIVA)
      const descriptor = makeDescriptor(1)
      connection.getRepository.mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(makeQB([descriptor])),
      })

      const submissions = [
        makeSubmission([
          makeAnswer(1, 'A', 'A'), // válida, acertou
          makeAnswer(1, 'B', 'A', true), // anulada — mesmo MTI_ID mas ignorada
        ]),
      ]

      await service.generateReportDescriptorBySchoolClass({
        exam,
        reportEdition: { id: 5 } as ReportEdition,
        studentSubmissions: submissions as any,
      })

      const created = reportDescriptorRepository.create.mock.calls[0][0]
      expect(created.total).toBe(1) // só a válida
      expect(created.totalCorrect).toBe(1)
    })
  })
})
