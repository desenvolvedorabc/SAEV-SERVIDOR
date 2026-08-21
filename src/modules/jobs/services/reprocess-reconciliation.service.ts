import { Inject, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { LessThan, Repository } from 'typeorm'

import {
  REPROCESS_DISPATCHER,
  ReprocessDispatcher,
} from '../dispatcher/reprocess-dispatcher.interface'
import { AnswerKeyChangeLog } from '../model/entities/answer-key-change-log.entity'
import { ReprocessStatus } from '../model/enums/reprocess-status.enum'

const ORPHAN_THRESHOLD_MS = 5 * 60_000
const BATCH_SIZE = 100

export interface ReconciliationResult {
  scanned: number
  rescheduled: number
  failed: number
}

@Injectable()
export class ReprocessReconciliationService {
  private readonly logger = new Logger(ReprocessReconciliationService.name)

  constructor(
    @InjectRepository(AnswerKeyChangeLog)
    private readonly changeLogRepository: Repository<AnswerKeyChangeLog>,

    @Inject(REPROCESS_DISPATCHER)
    private readonly dispatcher: ReprocessDispatcher,
  ) {}

  async reconcile(): Promise<ReconciliationResult> {
    const cutoff = new Date(Date.now() - ORPHAN_THRESHOLD_MS)
    const orphans = await this.changeLogRepository.find({
      where: {
        reprocessStatus: ReprocessStatus.PENDING,
        changedAt: LessThan(cutoff),
      },
      take: BATCH_SIZE,
    })

    const results = await Promise.allSettled(
      orphans.map(async (orphan) => {
        this.logger.warn(
          `Re-scheduling orphan changelog ${orphan.id} (testTemplate ${orphan.testTemplateId})`,
        )
        await this.dispatcher.scheduleDebounce(orphan.testTemplateId, orphan.id)
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
          `Failed to re-schedule orphan ${orphans[idx].id}: ${
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason)
          }`,
        )
      }
    })

    return {
      scanned: orphans.length,
      rescheduled,
      failed,
    }
  }
}
