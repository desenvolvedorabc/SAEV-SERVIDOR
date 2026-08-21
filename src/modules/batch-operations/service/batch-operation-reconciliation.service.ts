import { Inject, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { LessThan, Repository } from 'typeorm'

import {
  BATCH_OPERATION_DISPATCHER,
  BatchOperationDispatcher,
} from '../dispatcher/batch-operation-dispatcher.interface'
import { BatchOperation } from '../model/entities/batch-operation.entity'
import { BatchOperationStatus } from '../model/enums/batch-operation-status.enum'

const PENDING_ORPHAN_THRESHOLD_MS = 5 * 60_000
const RUNNING_STUCK_THRESHOLD_MS = 15 * 60_000
const BATCH_SIZE = 100

export interface ReconciliationResult {
  scanned: number
  rescheduled: number
  failed: number
}

@Injectable()
export class BatchOperationReconciliationService {
  private readonly logger = new Logger(BatchOperationReconciliationService.name)

  constructor(
    @InjectRepository(BatchOperation)
    private readonly batchOperationRepository: Repository<BatchOperation>,

    @Inject(BATCH_OPERATION_DISPATCHER)
    private readonly dispatcher: BatchOperationDispatcher,
  ) {}

  async reconcile(): Promise<ReconciliationResult> {
    const now = Date.now()
    const pendingCutoff = new Date(now - PENDING_ORPHAN_THRESHOLD_MS)
    const runningCutoff = new Date(now - RUNNING_STUCK_THRESHOLD_MS)

    const [pendingOrphans, stuckRunning] = await Promise.all([
      this.batchOperationRepository.find({
        where: {
          status: BatchOperationStatus.PENDING,
          createdAt: LessThan(pendingCutoff),
        },
        take: BATCH_SIZE,
      }),
      this.batchOperationRepository.find({
        where: {
          status: BatchOperationStatus.RUNNING,
          updatedAt: LessThan(runningCutoff),
        },
        take: BATCH_SIZE,
      }),
    ])

    const operations = [...pendingOrphans, ...stuckRunning]

    const results = await Promise.allSettled(
      operations.map(async (operation) => {
        this.logger.warn(
          `Re-scheduling batch operation ${operation.id} (status ${operation.status})`,
        )
        await this.dispatcher.scheduleExecute(operation.id)
      }),
    )

    let rescheduled = 0
    let failed = 0
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        rescheduled++
      } else {
        failed++
        this.logger.error(
          `Failed to re-schedule batch operation ${operations[idx].id}: ${
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason)
          }`,
        )
      }
    })

    return { scanned: operations.length, rescheduled, failed }
  }
}
