import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Connection, Repository } from 'typeorm'

import { TestTemplate } from '../../test/model/entities/test-template.entity'
import {
  REPROCESS_DISPATCHER,
  ReprocessDispatcher,
} from '../dispatcher/reprocess-dispatcher.interface'
import { Job as SAEVJob } from '../job.entity'
import { AnswerKeyChangeLog } from '../model/entities/answer-key-change-log.entity'
import { JobStatus } from '../model/enums/job-status.enum'
import { ReprocessStatus } from '../model/enums/reprocess-status.enum'
import { ReprocessService } from '../services/reprocess.service'
import { ReprocessDispatchService } from './reprocess-dispatch.service'

type MockRepo<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>
const mockRepo = <T = any>(): MockRepo<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
})

const mockDispatcher = (): jest.Mocked<ReprocessDispatcher> => ({
  scheduleDebounce: jest.fn(),
  scheduleExecute: jest.fn(),
})

const mockReprocessService = () => ({
  resolveTargets: jest.fn(),
})

// Fábrica de EntityManager fake para a transação
const makeManager = (jobRepo: {
  createQueryBuilder: jest.Mock
  create: jest.Mock
  save: jest.Mock
  update: jest.Mock
}) => ({
  getRepository: jest.fn().mockReturnValue(jobRepo),
  update: jest.fn(),
})

describe('ReprocessDispatchService', () => {
  let service: ReprocessDispatchService
  let changeLogRepo: MockRepo<AnswerKeyChangeLog>
  let testTemplateRepo: MockRepo<TestTemplate>
  let reprocessService: ReturnType<typeof mockReprocessService>
  let dispatcher: jest.Mocked<ReprocessDispatcher>
  let connection: { transaction: jest.Mock }

  beforeEach(async () => {
    changeLogRepo = mockRepo()
    testTemplateRepo = mockRepo()
    reprocessService = mockReprocessService()
    dispatcher = mockDispatcher()
    connection = { transaction: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReprocessDispatchService,
        { provide: Connection, useValue: connection },
        {
          provide: getRepositoryToken(TestTemplate),
          useValue: testTemplateRepo,
        },
        {
          provide: getRepositoryToken(AnswerKeyChangeLog),
          useValue: changeLogRepo,
        },
        { provide: ReprocessService, useValue: reprocessService },
        { provide: REPROCESS_DISPATCHER, useValue: dispatcher },
      ],
    }).compile()

    service = module.get<ReprocessDispatchService>(ReprocessDispatchService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('handle', () => {
    it('marca changelogs como FAILED quando template não é encontrado', async () => {
      changeLogRepo.find.mockResolvedValue([{ id: 1 }, { id: 2 }])
      testTemplateRepo.findOne.mockResolvedValue(null)

      await service.handle(99)

      expect(changeLogRepo.update).toHaveBeenCalledWith(
        { id: expect.anything() },
        expect.objectContaining({ reprocessStatus: ReprocessStatus.FAILED }),
      )
      expect(connection.transaction).not.toHaveBeenCalled()
    })

    it('marca changelogs como FAILED quando template não tem TEG_TES', async () => {
      changeLogRepo.find.mockResolvedValue([{ id: 1 }])
      testTemplateRepo.findOne.mockResolvedValue({ TEG_ID: 99, TEG_TES: null })

      await service.handle(99)

      expect(changeLogRepo.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ reprocessStatus: ReprocessStatus.FAILED }),
      )
    })

    it('marca changelogs como DONE sem criar jobs quando não há targets', async () => {
      changeLogRepo.find.mockResolvedValue([{ id: 5 }])
      testTemplateRepo.findOne.mockResolvedValue({
        TEG_ID: 10,
        TEG_TES: { TES_ID: 42 },
      })
      reprocessService.resolveTargets.mockResolvedValue([])

      await service.handle(10)

      expect(changeLogRepo.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ reprocessStatus: ReprocessStatus.DONE }),
      )
      expect(connection.transaction).not.toHaveBeenCalled()
    })

    it('cria jobs na transação e agenda execução para cada target', async () => {
      changeLogRepo.find.mockResolvedValue([{ id: 7 }])
      testTemplateRepo.findOne.mockResolvedValue({
        TEG_ID: 10,
        TEG_TES: { TES_ID: 42 },
      })
      reprocessService.resolveTargets.mockResolvedValue([
        { assessmentId: 1, countyId: 100, type: 'URBANA' },
        { assessmentId: 1, countyId: 200, type: 'URBANA' },
      ])

      const jobRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        }),
        create: jest.fn().mockReturnValue({ id: undefined }),
        save: jest
          .fn()
          .mockResolvedValueOnce({ id: 101 })
          .mockResolvedValueOnce({ id: 102 }),
        update: jest.fn(),
      }
      const manager = makeManager(jobRepo)
      connection.transaction.mockImplementation((cb) => cb(manager))
      dispatcher.scheduleExecute.mockResolvedValue(undefined)

      await service.handle(10)

      expect(connection.transaction).toHaveBeenCalledTimes(1)
      expect(dispatcher.scheduleExecute).toHaveBeenCalledWith(101)
      expect(dispatcher.scheduleExecute).toHaveBeenCalledWith(102)
    })

    it('faz merge dos testIds quando job PENDING já existe para o target', async () => {
      changeLogRepo.find.mockResolvedValue([{ id: 7 }])
      testTemplateRepo.findOne.mockResolvedValue({
        TEG_ID: 10,
        TEG_TES: { TES_ID: 42 },
      })
      reprocessService.resolveTargets.mockResolvedValue([
        { assessmentId: 1, countyId: 100, type: 'URBANA' },
      ])

      const existingJob = {
        id: 55,
        status: JobStatus.PENDING,
        affectedTestIds: ['11', '22'],
      }
      const jobRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(existingJob),
        }),
        create: jest.fn(),
        save: jest.fn().mockResolvedValue(existingJob),
        update: jest.fn(),
      }
      const manager = makeManager(jobRepo)
      connection.transaction.mockImplementation((cb) => cb(manager))
      dispatcher.scheduleExecute.mockResolvedValue(undefined)

      await service.handle(10)

      // testId 42 deve ter sido adicionado aos existentes [11, 22]
      expect(existingJob.affectedTestIds).toContain('42')
      expect(dispatcher.scheduleExecute).toHaveBeenCalledWith(55)
    })

    it('não falha globalmente quando scheduleExecute rejeita para um job', async () => {
      changeLogRepo.find.mockResolvedValue([{ id: 7 }])
      testTemplateRepo.findOne.mockResolvedValue({
        TEG_ID: 10,
        TEG_TES: { TES_ID: 42 },
      })
      reprocessService.resolveTargets.mockResolvedValue([
        { assessmentId: 1, countyId: 100, type: 'URBANA' },
        { assessmentId: 1, countyId: 200, type: 'URBANA' },
      ])

      const jobRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        }),
        create: jest.fn().mockReturnValue({}),
        save: jest
          .fn()
          .mockResolvedValueOnce({ id: 101 })
          .mockResolvedValueOnce({ id: 102 }),
        update: jest.fn(),
      }
      const manager = makeManager(jobRepo)
      connection.transaction.mockImplementation((cb) => cb(manager))
      dispatcher.scheduleExecute
        .mockRejectedValueOnce(new Error('throttle'))
        .mockResolvedValueOnce(undefined)

      await expect(service.handle(10)).resolves.not.toThrow()
    })
  })
})
