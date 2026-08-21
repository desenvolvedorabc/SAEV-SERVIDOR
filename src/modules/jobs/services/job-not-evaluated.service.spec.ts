import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { TypeAssessmentEnum } from 'src/modules/assessment/model/enum/type-assessment.enum'
import { StudentTest } from 'src/modules/release-results/model/entities/student-test.entity'
import { ReportEdition } from 'src/modules/reports/model/entities/report-edition.entity'
import { ReportNotEvaluated } from 'src/modules/reports/model/entities/report-not-evaluated.entity'
import { ReportsService } from 'src/modules/reports/service/reports.service'
import { Repository } from 'typeorm'

import { JobNotEvaluatedService } from './job-not-evaluated.service'
import { JobNotEvaluatedRepository } from './repositories/job-not-evaluated.repository'

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
  type: 'Objetiva',
  name: 'Matemática',
  countTotalStudents: 30,
  countStudentsLaunched: 25,
  countPresentStudents: 20,
  recusa: 1,
  ausencia: 2,
  abandono: 0,
  transferencia: 1,
  deficiencia: 0,
  nao_participou: 1,
  ...overrides,
})

describe('JobNotEvaluatedService', () => {
  let service: JobNotEvaluatedService
  let reportNotEvaluatedRepository: MockRepo<ReportNotEvaluated>
  let reportsService: { upsertReportEditionByAssessmentId: jest.Mock }
  let jobNotEvaluatedRepository: {
    getMunicipalityRegionalByCounty: jest.Mock
    getReportNotEvaluatedGroupedByTestAndSchoolClass: jest.Mock
    getReportEditionGroupedByMunicipalityRegional: jest.Mock
  }

  beforeEach(async () => {
    reportNotEvaluatedRepository = mockRepo()
    reportsService = {
      upsertReportEditionByAssessmentId: jest
        .fn()
        .mockResolvedValue({ id: 99 } as ReportEdition),
    }
    jobNotEvaluatedRepository = {
      getMunicipalityRegionalByCounty: jest.fn().mockResolvedValue([]),
      getReportNotEvaluatedGroupedByTestAndSchoolClass: jest
        .fn()
        .mockResolvedValue([]),
      getReportEditionGroupedByMunicipalityRegional: jest
        .fn()
        .mockResolvedValue([]),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobNotEvaluatedService,
        {
          provide: getRepositoryToken(ReportNotEvaluated),
          useValue: reportNotEvaluatedRepository,
        },
        { provide: ReportsService, useValue: reportsService },
        {
          provide: JobNotEvaluatedRepository,
          useValue: jobNotEvaluatedRepository,
        },
      ],
    }).compile()

    service = module.get<JobNotEvaluatedService>(JobNotEvaluatedService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('generateByCounty', () => {
    it('não salva nada quando repositório retorna vazio', async () => {
      await service.generateByCounty(1, 10, TypeAssessmentEnum.MUNICIPAL)

      expect(reportNotEvaluatedRepository.save).not.toHaveBeenCalled()
    })

    it('agrupa por município e faz upsert de ReportEdition por grupo', async () => {
      // dois testes do mesmo município → 1 grupo → 1 upsert, 2 saves
      jobNotEvaluatedRepository.getMunicipalityRegionalByCounty.mockResolvedValue(
        [makeRow({ testTESID: 42 }), makeRow({ testTESID: 55 })],
      )

      await service.generateByCounty(1, 10, TypeAssessmentEnum.MUNICIPAL)

      expect(
        reportsService.upsertReportEditionByAssessmentId,
      ).toHaveBeenCalledTimes(1)
      expect(reportNotEvaluatedRepository.save).toHaveBeenCalledTimes(2)
    })

    it('gera um upsert por município distinto', async () => {
      // dois municípios distintos → 2 grupos → 2 upserts
      jobNotEvaluatedRepository.getMunicipalityRegionalByCounty.mockResolvedValue(
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
  })

  describe('generateBySchool', () => {
    it('não salva nada quando repositório retorna vazio', async () => {
      await service.generateBySchool(1, 10, TypeAssessmentEnum.MUNICIPAL)

      expect(reportNotEvaluatedRepository.save).not.toHaveBeenCalled()
    })

    it('agrupa por escola e salva um ReportNotEvaluated por linha', async () => {
      jobNotEvaluatedRepository.getReportNotEvaluatedGroupedByTestAndSchoolClass.mockResolvedValue(
        [
          makeRow({ ESC_ID: 20, testTESID: 42 }),
          makeRow({ ESC_ID: 20, testTESID: 55 }),
        ],
      )

      await service.generateBySchool(1, 10, TypeAssessmentEnum.MUNICIPAL)

      expect(
        reportsService.upsertReportEditionByAssessmentId,
      ).toHaveBeenCalledTimes(1)
      expect(reportNotEvaluatedRepository.save).toHaveBeenCalledTimes(2)
    })
  })

  describe('generateByMunicipalityRegional', () => {
    it('não salva nada quando repositório retorna vazio', async () => {
      await service.generateByMunicipalityRegional(
        1,
        10,
        TypeAssessmentEnum.MUNICIPAL,
      )

      expect(reportNotEvaluatedRepository.save).not.toHaveBeenCalled()
    })

    it('agrupa por regional e faz upsert por grupo', async () => {
      jobNotEvaluatedRepository.getReportEditionGroupedByMunicipalityRegional.mockResolvedValue(
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
      expect(reportNotEvaluatedRepository.save).toHaveBeenCalledTimes(3)
    })
  })

  describe('generateBySchoolClass', () => {
    const exam = {
      TES_DIS: { DIS_TIPO: 'Objetiva', DIS_NOME: 'Matemática' },
    } as any
    const reportEdition = { id: 5 } as ReportEdition

    it('contabiliza cada motivo de não avaliação corretamente', async () => {
      const makeSubmission = (justificativa: string) =>
        ({
          ALT_FINALIZADO: 0,
          ANSWERS_TEST: [],
          ALT_JUSTIFICATIVA: justificativa,
        }) as unknown as StudentTest

      const submissions = [
        makeSubmission('Recusou-se a participar'),
        makeSubmission('Faltou mas está Frequentando a escola'),
        makeSubmission('Abandonou a escola'),
        makeSubmission('Foi Transferido para outra escola'),
        makeSubmission('Não participou por motivo de deficiência'),
        makeSubmission('Não participou'),
      ]

      await service.generateBySchoolClass({
        exam,
        ids: ['1', '2', '3', '4', '5', '6'],
        reportEdition,
        studentSubmissions: submissions,
        totalStudents: 6,
      })

      const created = reportNotEvaluatedRepository.create.mock.calls[0][0]
      expect(created.recusa).toBe(1)
      expect(created.ausencia).toBe(1)
      expect(created.abandono).toBe(1)
      expect(created.transferencia).toBe(1)
      expect(created.deficiencia).toBe(1)
      expect(created.nao_participou).toBe(1)
      expect(reportNotEvaluatedRepository.save).toHaveBeenCalledTimes(1)
    })

    it('conta como presente aluno finalizado mesmo sem justificativa', async () => {
      const submissions = [
        {
          ALT_FINALIZADO: 1,
          ANSWERS_TEST: [],
          ALT_JUSTIFICATIVA: '',
        } as unknown as StudentTest,
        {
          ALT_FINALIZADO: 0,
          ANSWERS_TEST: [{}],
          ALT_JUSTIFICATIVA: '',
        } as unknown as StudentTest,
      ]

      await service.generateBySchoolClass({
        exam,
        ids: ['1', '2'],
        reportEdition,
        studentSubmissions: submissions,
        totalStudents: 2,
      })

      const created = reportNotEvaluatedRepository.create.mock.calls[0][0]
      // ambos vão para totalPresent (finalizado=true ou tem answers ou justificativa vazia)
      expect(created.countPresentStudents).toBe(2)
    })

    it('salva com countTotalStudents e countStudentsLaunched corretos', async () => {
      const submissions = [
        {
          ALT_FINALIZADO: 1,
          ANSWERS_TEST: [],
          ALT_JUSTIFICATIVA: '',
        } as unknown as StudentTest,
      ]

      await service.generateBySchoolClass({
        exam,
        ids: ['1', '2', '3'],
        reportEdition,
        studentSubmissions: submissions,
        totalStudents: 3,
      })

      const created = reportNotEvaluatedRepository.create.mock.calls[0][0]
      expect(created.countTotalStudents).toBe(3)
      expect(created.countStudentsLaunched).toBe(1)
    })
  })
})
