import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import {
  REPROCESS_DISPATCHER,
  ReprocessDispatcher,
} from '../dispatcher/reprocess-dispatcher.interface'
import { AnswerKeyChangeLog } from '../model/entities/answer-key-change-log.entity'
import { ReprocessStatus } from '../model/enums/reprocess-status.enum'
import { ReprocessReconciliationService } from './reprocess-reconciliation.service'

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>
const createMockRepository = <T = any>(): MockRepository<T> => ({
  find: jest.fn(),
})

const createMockDispatcher = (): jest.Mocked<ReprocessDispatcher> => ({
  scheduleDebounce: jest.fn(),
  scheduleExecute: jest.fn(),
})

describe('ReprocessReconciliationService', () => {
  let service: ReprocessReconciliationService
  let changeLogRepository: MockRepository<AnswerKeyChangeLog>
  let dispatcher: jest.Mocked<ReprocessDispatcher>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReprocessReconciliationService,
        {
          provide: getRepositoryToken(AnswerKeyChangeLog),
          useValue: createMockRepository(),
        },
        {
          provide: REPROCESS_DISPATCHER,
          useValue: createMockDispatcher(),
        },
      ],
    }).compile()

    service = module.get<ReprocessReconciliationService>(
      ReprocessReconciliationService,
    )
    changeLogRepository = module.get(getRepositoryToken(AnswerKeyChangeLog))
    dispatcher = module.get(REPROCESS_DISPATCHER)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('reconcile', () => {
    it('retorna zeros quando não há changelogs órfãos', async () => {
      changeLogRepository.find.mockResolvedValue([])

      const result = await service.reconcile()

      expect(result).toEqual({ scanned: 0, rescheduled: 0, failed: 0 })
      expect(dispatcher.scheduleDebounce).not.toHaveBeenCalled()
    })

    it('reschedula cada órfão via dispatcher', async () => {
      const orphans = [
        { id: 1, testTemplateId: 10, reprocessStatus: ReprocessStatus.PENDING },
        { id: 2, testTemplateId: 20, reprocessStatus: ReprocessStatus.PENDING },
      ] as AnswerKeyChangeLog[]
      changeLogRepository.find.mockResolvedValue(orphans)
      dispatcher.scheduleDebounce.mockResolvedValue(undefined)

      const result = await service.reconcile()

      expect(result).toEqual({ scanned: 2, rescheduled: 2, failed: 0 })
      expect(dispatcher.scheduleDebounce).toHaveBeenCalledWith(10, 1)
      expect(dispatcher.scheduleDebounce).toHaveBeenCalledWith(20, 2)
    })

    it('conta falhas individuais sem lançar exceção', async () => {
      const orphans = [
        { id: 1, testTemplateId: 10, reprocessStatus: ReprocessStatus.PENDING },
        { id: 2, testTemplateId: 20, reprocessStatus: ReprocessStatus.PENDING },
        { id: 3, testTemplateId: 30, reprocessStatus: ReprocessStatus.PENDING },
      ] as AnswerKeyChangeLog[]
      changeLogRepository.find.mockResolvedValue(orphans)
      dispatcher.scheduleDebounce
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Cloud Tasks throttle'))
        .mockResolvedValueOnce(undefined)

      const result = await service.reconcile()

      expect(result).toEqual({ scanned: 3, rescheduled: 2, failed: 1 })
    })

    it('busca changelogs PENDING com cutoff de 5 minutos no passado', async () => {
      const before = Date.now()
      changeLogRepository.find.mockResolvedValue([])

      await service.reconcile()

      const call = changeLogRepository.find.mock.calls[0][0]
      expect(call.where.reprocessStatus).toBe(ReprocessStatus.PENDING)
      const cutoff: Date = call.where.changedAt.value
      expect(cutoff.getTime()).toBeGreaterThanOrEqual(before - 5 * 60_000 - 100)
      expect(cutoff.getTime()).toBeLessThanOrEqual(before - 5 * 60_000 + 100)
      expect(call.take).toBe(100)
    })
  })
})
