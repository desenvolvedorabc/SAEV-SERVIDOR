import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import {
  BATCH_OPERATION_DISPATCHER,
  BatchOperationDispatcher,
} from '../dispatcher/batch-operation-dispatcher.interface'
import { BatchOperation } from '../model/entities/batch-operation.entity'
import { BatchOperationStatus } from '../model/enums/batch-operation-status.enum'
import { BatchOperationReconciliationService } from './batch-operation-reconciliation.service'

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>
const createMockRepository = <T = any>(): MockRepository<T> => ({
  find: jest.fn(),
})

const createMockDispatcher = (): jest.Mocked<BatchOperationDispatcher> => ({
  scheduleExecute: jest.fn(),
})

describe('BatchOperationReconciliationService', () => {
  let service: BatchOperationReconciliationService
  let repository: MockRepository<BatchOperation>
  let dispatcher: jest.Mocked<BatchOperationDispatcher>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchOperationReconciliationService,
        {
          provide: getRepositoryToken(BatchOperation),
          useValue: createMockRepository(),
        },
        {
          provide: BATCH_OPERATION_DISPATCHER,
          useValue: createMockDispatcher(),
        },
      ],
    }).compile()

    service = module.get(BatchOperationReconciliationService)
    repository = module.get(getRepositoryToken(BatchOperation))
    dispatcher = module.get(BATCH_OPERATION_DISPATCHER)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('retorna zeros quando não há operações órfãs/travadas', async () => {
    repository.find.mockResolvedValue([])

    const result = await service.reconcile()

    expect(result).toEqual({ scanned: 0, rescheduled: 0, failed: 0 })
    expect(dispatcher.scheduleExecute).not.toHaveBeenCalled()
  })

  it('reschedula operações PENDING órfãs e RUNNING travadas', async () => {
    repository.find
      .mockResolvedValueOnce([
        { id: 1, status: BatchOperationStatus.PENDING },
      ] as BatchOperation[])
      .mockResolvedValueOnce([
        { id: 2, status: BatchOperationStatus.RUNNING },
      ] as BatchOperation[])
    dispatcher.scheduleExecute.mockResolvedValue(undefined)

    const result = await service.reconcile()

    expect(result).toEqual({ scanned: 2, rescheduled: 2, failed: 0 })
    expect(dispatcher.scheduleExecute).toHaveBeenCalledWith(1)
    expect(dispatcher.scheduleExecute).toHaveBeenCalledWith(2)
  })

  it('conta falhas individuais sem lançar exceção', async () => {
    repository.find
      .mockResolvedValueOnce([
        { id: 1, status: BatchOperationStatus.PENDING },
        { id: 2, status: BatchOperationStatus.PENDING },
      ] as BatchOperation[])
      .mockResolvedValueOnce([])
    dispatcher.scheduleExecute
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Cloud Tasks throttle'))

    const result = await service.reconcile()

    expect(result).toEqual({ scanned: 2, rescheduled: 1, failed: 1 })
  })

  it('usa cutoffs de 5min (PENDING) e 15min (RUNNING)', async () => {
    const before = Date.now()
    repository.find.mockResolvedValue([])

    await service.reconcile()

    const pendingCall = repository.find.mock.calls[0][0]
    const runningCall = repository.find.mock.calls[1][0]

    expect(pendingCall.where.status).toBe(BatchOperationStatus.PENDING)
    const pendingCutoff: Date = pendingCall.where.createdAt.value
    expect(pendingCutoff.getTime()).toBeGreaterThanOrEqual(
      before - 5 * 60_000 - 200,
    )
    expect(pendingCutoff.getTime()).toBeLessThanOrEqual(
      before - 5 * 60_000 + 200,
    )

    expect(runningCall.where.status).toBe(BatchOperationStatus.RUNNING)
    const runningCutoff: Date = runningCall.where.updatedAt.value
    expect(runningCutoff.getTime()).toBeGreaterThanOrEqual(
      before - 15 * 60_000 - 200,
    )
    expect(runningCutoff.getTime()).toBeLessThanOrEqual(
      before - 15 * 60_000 + 200,
    )
  })
})
