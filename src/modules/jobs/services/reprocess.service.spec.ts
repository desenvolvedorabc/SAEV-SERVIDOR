import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import * as sendMailModule from 'src/helpers/sendMail'
import { Connection, Repository } from 'typeorm'

import { Job as SAEVJob } from '../job.entity'
import { JobsService } from '../jobs.service'
import { JobStatus } from '../model/enums/job-status.enum'
import { ReprocessService } from './reprocess.service'
import { ReprocessSchoolClassService } from './reprocess-school-class.service'

type MockRepo<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>
const mockRepo = <T = any>(): MockRepo<T> => ({
  findOne: jest.fn(),
  save: jest.fn(),
})

const mockConnection = () => ({
  getRepository: jest.fn().mockReturnValue({
    createQueryBuilder: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(null),
    }),
  }),
})

const mockJobsService = () => ({
  generateReportEditionsBySchool: jest.fn().mockResolvedValue(undefined),
  generateReportEditionsByMunicipalityRegional: jest
    .fn()
    .mockResolvedValue(undefined),
  generateReportEditionsByCounty: jest.fn().mockResolvedValue(undefined),
})

const mockReprocessSchoolClassService = () => ({
  regenerate: jest.fn().mockResolvedValue(undefined),
})

function makeConnectionQB(assessment: object | null) {
  return {
    createQueryBuilder: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(assessment),
      getCount: jest.fn().mockResolvedValue(1),
    }),
  }
}

function makeJob(overrides: Partial<SAEVJob> = {}): SAEVJob {
  return {
    id: 1,
    assessmentId: 10,
    countyId: 100,
    status: JobStatus.PENDING,
    retryCount: 0,
    affectedTestIds: ['42'],
    startDate: new Date(),
    endDate: new Date(),
    updatedAt: new Date(Date.now() - 60_000), // 1 min atrás
    errorMessage: null,
    ...overrides,
  } as SAEVJob
}

describe('ReprocessService', () => {
  let service: ReprocessService
  let jobsRepository: MockRepo<SAEVJob>
  let jobsService: ReturnType<typeof mockJobsService>
  let reprocessSchoolClassService: ReturnType<
    typeof mockReprocessSchoolClassService
  >
  let connection: ReturnType<typeof mockConnection>

  beforeEach(async () => {
    jobsRepository = mockRepo()
    jobsService = mockJobsService()
    reprocessSchoolClassService = mockReprocessSchoolClassService()
    connection = mockConnection()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReprocessService,
        { provide: Connection, useValue: connection },
        { provide: getRepositoryToken(SAEVJob), useValue: jobsRepository },
        { provide: JobsService, useValue: jobsService },
        {
          provide: ReprocessSchoolClassService,
          useValue: reprocessSchoolClassService,
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('') },
        },
      ],
    }).compile()

    service = module.get<ReprocessService>(ReprocessService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('executeReprocess', () => {
    it('retorna sem fazer nada quando job não é encontrado', async () => {
      jobsRepository.findOne.mockResolvedValue(null)

      await service.executeReprocess(999)

      expect(jobsRepository.save).not.toHaveBeenCalled()
    })

    it('retorna sem fazer nada quando job já está DONE', async () => {
      jobsRepository.findOne.mockResolvedValue(
        makeJob({ status: JobStatus.DONE }),
      )

      await service.executeReprocess(1)

      expect(jobsRepository.save).not.toHaveBeenCalled()
    })

    it('pula job RUNNING recente (< 30min) sem reprocessar', async () => {
      const job = makeJob({
        status: JobStatus.RUNNING,
        updatedAt: new Date(Date.now() - 5 * 60_000), // 5 min atrás
      })
      jobsRepository.findOne.mockResolvedValue(job)

      await service.executeReprocess(1)

      expect(reprocessSchoolClassService.regenerate).not.toHaveBeenCalled()
    })

    it('reclaim de job RUNNING stuck há mais de 30min e reprocessa', async () => {
      const job = makeJob({
        status: JobStatus.RUNNING,
        updatedAt: new Date(Date.now() - 31 * 60_000), // 31 min atrás
      })
      const assessment = {
        AVA_ID: 10,
        AVA_ANO: 2024,
        AVA_NOME: 'AVA',
        AVA_AVM: [{ AVM_MUN: { MUN_ID: 100 }, AVM_TIPO: 'URBANA' }],
      }
      jobsRepository.findOne.mockResolvedValue(job)
      jobsRepository.save.mockResolvedValue(job)
      connection.getRepository.mockReturnValue(makeConnectionQB(assessment))

      await service.executeReprocess(1)

      expect(reprocessSchoolClassService.regenerate).toHaveBeenCalled()
      expect(job.retryCount).toBeGreaterThan(0)
    })

    it('executa pipeline completo e marca job como DONE', async () => {
      const job = makeJob()
      const assessment = {
        AVA_ID: 10,
        AVA_ANO: 2024,
        AVA_NOME: 'AVA',
        AVA_AVM: [{ AVM_MUN: { MUN_ID: 100 }, AVM_TIPO: 'URBANA' }],
      }
      jobsRepository.findOne.mockResolvedValue(job)
      jobsRepository.save.mockResolvedValue(job)
      connection.getRepository.mockReturnValue(makeConnectionQB(assessment))

      await service.executeReprocess(1)

      expect(reprocessSchoolClassService.regenerate).toHaveBeenCalledWith(
        10,
        100,
        'URBANA',
        [42],
      )
      expect(jobsService.generateReportEditionsBySchool).toHaveBeenCalledWith(
        10,
        100,
        'URBANA',
        [42],
      )
      expect(
        jobsService.generateReportEditionsByMunicipalityRegional,
      ).toHaveBeenCalledWith(10, 100, 'URBANA', [42])
      expect(jobsService.generateReportEditionsByCounty).toHaveBeenCalledWith(
        10,
        100,
        'URBANA',
        [42],
      )
      expect(job.status).toBe(JobStatus.DONE)
    })

    it('marca job como FAILED e salva errorMessage quando pipeline lança exceção', async () => {
      const job = makeJob()
      const assessment = {
        AVA_ID: 10,
        AVA_AVM: [{ AVM_MUN: { MUN_ID: 100 }, AVM_TIPO: 'URBANA' }],
      }
      jobsRepository.findOne.mockResolvedValue(job)
      jobsRepository.save.mockResolvedValue(job)
      connection.getRepository.mockReturnValue(makeConnectionQB(assessment))
      reprocessSchoolClassService.regenerate.mockRejectedValue(
        new Error('DB timeout'),
      )

      await service.executeReprocess(1)

      expect(job.status).toBe(JobStatus.FAILED)
      expect(job.errorMessage).toBe('DB timeout')
    })

    it('lança erro quando assessment não é encontrado no banco', async () => {
      const job = makeJob()
      jobsRepository.findOne.mockResolvedValue(job)
      jobsRepository.save.mockResolvedValue(job)
      connection.getRepository.mockReturnValue(makeConnectionQB(null))

      await service.executeReprocess(1)

      expect(job.status).toBe(JobStatus.FAILED)
      expect(job.errorMessage).toMatch(/not found/)
    })

    it('marca FAILED quando assessment existe mas countyId não está em AVA_AVM', async () => {
      const job = makeJob({ countyId: 999 })
      const assessment = {
        AVA_ID: 10,
        AVA_AVM: [{ AVM_MUN: { MUN_ID: 100 }, AVM_TIPO: 'URBANA' }],
      }
      jobsRepository.findOne.mockResolvedValue(job)
      jobsRepository.save.mockResolvedValue(job)
      connection.getRepository.mockReturnValue(makeConnectionQB(assessment))

      await service.executeReprocess(1)

      expect(job.status).toBe(JobStatus.FAILED)
      expect(job.errorMessage).toMatch(/not found/)
    })

    it('passes affectedTestIds to all rollup levels', async () => {
      const job = makeJob({ affectedTestIds: ['10', '20'] })
      const assessment = {
        AVA_ID: 10,
        AVA_ANO: 2024,
        AVA_NOME: 'AVA',
        AVA_AVM: [{ AVM_MUN: { MUN_ID: 100 }, AVM_TIPO: 'URBANA' }],
      }
      jobsRepository.findOne.mockResolvedValue(job)
      jobsRepository.save.mockResolvedValue(job)
      connection.getRepository.mockReturnValue(makeConnectionQB(assessment))

      await service.executeReprocess(1)

      expect(jobsService.generateReportEditionsBySchool).toHaveBeenCalledWith(
        10,
        100,
        'URBANA',
        [10, 20],
      )
      expect(
        jobsService.generateReportEditionsByMunicipalityRegional,
      ).toHaveBeenCalledWith(10, 100, 'URBANA', [10, 20])
      expect(jobsService.generateReportEditionsByCounty).toHaveBeenCalledWith(
        10,
        100,
        'URBANA',
        [10, 20],
      )
    })

    it('incrementa retryCount a cada execução', async () => {
      const job = makeJob({ retryCount: 2 })
      const assessment = {
        AVA_ID: 10,
        AVA_AVM: [{ AVM_MUN: { MUN_ID: 100 }, AVM_TIPO: 'URBANA' }],
      }
      jobsRepository.findOne.mockResolvedValue(job)
      jobsRepository.save.mockResolvedValue(job)
      connection.getRepository.mockReturnValue(makeConnectionQB(assessment))

      await service.executeReprocess(1)

      expect(job.retryCount).toBe(3)
    })
  })

  describe('notifyFailure', () => {
    it('envia email para cada destinatário configurado na env', async () => {
      const sendEmailSpy = jest
        .spyOn(sendMailModule, 'sendEmail')
        .mockResolvedValue(undefined)

      const configGet = jest.fn().mockReturnValue('a@x.com,b@x.com')
      const module2: TestingModule = await Test.createTestingModule({
        providers: [
          ReprocessService,
          { provide: Connection, useValue: mockConnection() },
          { provide: getRepositoryToken(SAEVJob), useValue: mockRepo() },
          { provide: JobsService, useValue: mockJobsService() },
          {
            provide: ReprocessSchoolClassService,
            useValue: mockReprocessSchoolClassService(),
          },
          { provide: ConfigService, useValue: { get: configGet } },
        ],
      }).compile()

      const svc = module2.get<ReprocessService>(ReprocessService)

      const job = makeJob()
      const jobRepo = module2.get<MockRepo<SAEVJob>>(
        getRepositoryToken(SAEVJob),
      )
      jobRepo.findOne.mockResolvedValue(job)
      jobRepo.save.mockResolvedValue(job)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conn = module2.get<any>(Connection)
      conn.getRepository.mockReturnValue(makeConnectionQB(null)) // força FAILED

      await svc.executeReprocess(1)

      expect(sendEmailSpy).toHaveBeenCalledTimes(2)
      expect(sendEmailSpy).toHaveBeenCalledWith(
        'a@x.com',
        expect.any(String),
        expect.any(String),
      )
      expect(sendEmailSpy).toHaveBeenCalledWith(
        'b@x.com',
        expect.any(String),
        expect.any(String),
      )

      sendEmailSpy.mockRestore()
    })

    it('não envia email quando env está vazia', async () => {
      const sendEmailSpy = jest
        .spyOn(sendMailModule, 'sendEmail')
        .mockResolvedValue(undefined)

      // ConfigService padrão do beforeEach já retorna ''
      const job = makeJob()
      jobsRepository.findOne.mockResolvedValue(job)
      jobsRepository.save.mockResolvedValue(job)
      connection.getRepository.mockReturnValue(makeConnectionQB(null))

      await service.executeReprocess(1)

      expect(sendEmailSpy).not.toHaveBeenCalled()
      sendEmailSpy.mockRestore()
    })
  })

  describe('resolveTargets', () => {
    it('retorna lista vazia quando não há avaliações encerradas com lançamentos', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      }
      connection.getRepository.mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      })

      const result = await service.resolveTargets(42)

      expect(result).toEqual([])
    })

    it('mapeia rows raw para ReprocessTarget tipado', async () => {
      const raw = [
        { assessmentId: '1', countyId: '100', type: 'URBANA' },
        { assessmentId: '2', countyId: '200', type: 'RURAL' },
      ]
      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(raw),
      }
      connection.getRepository.mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      })

      const result = await service.resolveTargets(42)

      expect(result).toEqual([
        { assessmentId: 1, countyId: 100, type: 'URBANA' },
        { assessmentId: 2, countyId: 200, type: 'RURAL' },
      ])
    })
  })
})
