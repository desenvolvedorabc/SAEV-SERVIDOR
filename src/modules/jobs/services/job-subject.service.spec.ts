import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { TypeAssessmentEnum } from 'src/modules/assessment/model/enum/type-assessment.enum'
import { ReportEdition } from 'src/modules/reports/model/entities/report-edition.entity'
import { ReportSubject } from 'src/modules/reports/model/entities/report-subject.entity'
import { ReportsService } from 'src/modules/reports/service/reports.service'
import { Repository } from 'typeorm'

import { JobQuestionService } from './job-question.service'
import { JobRaceService } from './job-race.service'
import { JobSubjectService } from './job-subject.service'
import { JobSubjectRepository } from './repositories/job-subject.repository'

type MockRepo<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>
const mockRepo = <T = any>(): MockRepo<T> => ({
  create: jest.fn().mockReturnValue({ id: undefined }),
  save: jest.fn().mockResolvedValue({ id: 77 }),
  createQueryBuilder: jest.fn(),
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
  totalGradesStudents: 2000,
  countPresentStudents: 20,
  fluente: 0,
  nao_fluente: 0,
  frases: 0,
  palavras: 0,
  silabas: 0,
  nao_leitor: 0,
  nao_avaliado: 0,
  nao_informado: 0,
  ...overrides,
})

describe('JobSubjectService', () => {
  let service: JobSubjectService
  let reportSubjectsRepository: MockRepo<ReportSubject>
  let reportEditionsRepository: MockRepo<ReportEdition>
  let reportsService: { upsertReportEditionByAssessmentId: jest.Mock }
  let jobRaceService: {
    generateReportEditionsByCounty: jest.Mock
    generateReportEditionsBySchool: jest.Mock
    generateByMunicipalityRegional: jest.Mock
  }
  let jobQuestionService: {
    generateByCounty: jest.Mock
    generateBySchool: jest.Mock
    generateByMunicipalityRegional: jest.Mock
  }
  let jobSubjectRepository: {
    getMunicipalityRegionalReportEditions: jest.Mock
    getReportEditionGroupedByTestAndSchoolClass: jest.Mock
    getReportEditionGroupedByMunicipalityRegional: jest.Mock
  }

  beforeEach(async () => {
    reportSubjectsRepository = mockRepo()
    reportEditionsRepository = mockRepo()
    reportsService = {
      upsertReportEditionByAssessmentId: jest
        .fn()
        .mockResolvedValue({ id: 99 } as ReportEdition),
    }
    jobRaceService = {
      generateReportEditionsByCounty: jest.fn().mockResolvedValue(undefined),
      generateReportEditionsBySchool: jest.fn().mockResolvedValue(undefined),
      generateByMunicipalityRegional: jest.fn().mockResolvedValue(undefined),
    }
    jobQuestionService = {
      generateByCounty: jest.fn().mockResolvedValue(undefined),
      generateBySchool: jest.fn().mockResolvedValue(undefined),
      generateByMunicipalityRegional: jest.fn().mockResolvedValue(undefined),
    }
    jobSubjectRepository = {
      getMunicipalityRegionalReportEditions: jest.fn().mockResolvedValue([]),
      getReportEditionGroupedByTestAndSchoolClass: jest
        .fn()
        .mockResolvedValue([]),
      getReportEditionGroupedByMunicipalityRegional: jest
        .fn()
        .mockResolvedValue([]),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobSubjectService,
        {
          provide: getRepositoryToken(ReportEdition),
          useValue: reportEditionsRepository,
        },
        {
          provide: getRepositoryToken(ReportSubject),
          useValue: reportSubjectsRepository,
        },
        { provide: ReportsService, useValue: reportsService },
        { provide: JobRaceService, useValue: jobRaceService },
        { provide: JobQuestionService, useValue: jobQuestionService },
        { provide: JobSubjectRepository, useValue: jobSubjectRepository },
      ],
    }).compile()

    service = module.get<JobSubjectService>(JobSubjectService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('generateByCounty', () => {
    it('não salva nada quando repositório retorna vazio', async () => {
      await service.generateByCounty(1, 10, TypeAssessmentEnum.MUNICIPAL)

      expect(reportSubjectsRepository.save).not.toHaveBeenCalled()
    })

    it('faz upsert de ReportEdition por município e salva ReportSubject por linha', async () => {
      jobSubjectRepository.getMunicipalityRegionalReportEditions.mockResolvedValue(
        [makeRow({ testTESID: 42 }), makeRow({ testTESID: 55 })],
      )

      await service.generateByCounty(1, 10, TypeAssessmentEnum.MUNICIPAL)

      expect(
        reportsService.upsertReportEditionByAssessmentId,
      ).toHaveBeenCalledTimes(1)
      expect(reportSubjectsRepository.save).toHaveBeenCalledTimes(2)
    })

    it('aciona race e question services para cada subject salvo', async () => {
      jobSubjectRepository.getMunicipalityRegionalReportEditions.mockResolvedValue(
        [makeRow({ testTESID: 42 })],
      )

      await service.generateByCounty(1, 10, TypeAssessmentEnum.MUNICIPAL)

      expect(
        jobRaceService.generateReportEditionsByCounty,
      ).toHaveBeenCalledTimes(1)
      expect(jobQuestionService.generateByCounty).toHaveBeenCalledTimes(1)
    })

    it('gera um upsert por município distinto quando há dois grupos', async () => {
      jobSubjectRepository.getMunicipalityRegionalReportEditions.mockResolvedValue(
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

      expect(reportSubjectsRepository.save).not.toHaveBeenCalled()
    })

    it('agrupa por escola e aciona race + question services', async () => {
      jobSubjectRepository.getReportEditionGroupedByTestAndSchoolClass.mockResolvedValue(
        [
          makeRow({ ESC_ID: 20, testTESID: 42 }),
          makeRow({ ESC_ID: 20, testTESID: 55 }),
        ],
      )

      await service.generateBySchool(1, 10, TypeAssessmentEnum.MUNICIPAL)

      expect(
        reportsService.upsertReportEditionByAssessmentId,
      ).toHaveBeenCalledTimes(1)
      expect(reportSubjectsRepository.save).toHaveBeenCalledTimes(2)
      expect(
        jobRaceService.generateReportEditionsBySchool,
      ).toHaveBeenCalledTimes(2)
      expect(jobQuestionService.generateBySchool).toHaveBeenCalledTimes(2)
    })
  })

  describe('generateByMunicipalityRegional', () => {
    it('não salva nada quando repositório retorna vazio', async () => {
      await service.generateByMunicipalityRegional(
        1,
        10,
        TypeAssessmentEnum.MUNICIPAL,
      )

      expect(reportSubjectsRepository.save).not.toHaveBeenCalled()
    })

    it('agrupa por regional, faz upsert e aciona race + question services', async () => {
      jobSubjectRepository.getReportEditionGroupedByMunicipalityRegional.mockResolvedValue(
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
      expect(reportSubjectsRepository.save).toHaveBeenCalledTimes(3)
      expect(
        jobRaceService.generateByMunicipalityRegional,
      ).toHaveBeenCalledTimes(3)
      expect(
        jobQuestionService.generateByMunicipalityRegional,
      ).toHaveBeenCalledTimes(3)
    })
  })
})
