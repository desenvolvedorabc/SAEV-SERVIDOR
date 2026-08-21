import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { ReprocessService } from '../services/reprocess.service'
import { ReprocessDispatchService } from '../worker/reprocess-dispatch.service'
import { ReprocessDispatcher } from './reprocess-dispatcher.interface'

interface PendingDebounce {
  changeLogIds: Set<number>
  timer: NodeJS.Timeout
}

const DEFAULT_DEBOUNCE_MS = 60_000

@Injectable()
export class InProcessReprocessDispatcher
  implements ReprocessDispatcher, OnModuleDestroy
{
  private readonly logger = new Logger(InProcessReprocessDispatcher.name)
  private readonly pending = new Map<number, PendingDebounce>()
  private readonly debounceMs: number

  constructor(
    @Inject(forwardRef(() => ReprocessDispatchService))
    private readonly dispatchService: ReprocessDispatchService,
    private readonly reprocessService: ReprocessService,
    configService: ConfigService,
  ) {
    const seconds = Number(
      configService.get<string>('CLOUD_TASKS_DEBOUNCE_SECONDS') ?? '60',
    )
    this.debounceMs =
      Number.isFinite(seconds) && seconds > 0
        ? seconds * 1000
        : DEFAULT_DEBOUNCE_MS
  }

  onModuleDestroy(): void {
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer)
    }
    this.pending.clear()
  }

  async scheduleDebounce(
    testTemplateId: number,
    changeLogId: number,
  ): Promise<void> {
    const existing = this.pending.get(testTemplateId)
    if (existing) {
      clearTimeout(existing.timer)
      existing.changeLogIds.add(changeLogId)
      existing.timer = setTimeout(
        () => this.flush(testTemplateId),
        this.debounceMs,
      )
      return
    }

    this.pending.set(testTemplateId, {
      changeLogIds: new Set([changeLogId]),
      timer: setTimeout(() => this.flush(testTemplateId), this.debounceMs),
    })
  }

  async scheduleExecute(jobId: number): Promise<void> {
    setImmediate(() => {
      this.reprocessService.executeReprocess(jobId).catch((err) => {
        this.logger.error(
          `Reprocess job ${jobId} failed (in-process): ${
            err instanceof Error ? err.message : String(err)
          }`,
        )
      })
    })
  }

  private flush(testTemplateId: number): void {
    const entry = this.pending.get(testTemplateId)
    if (!entry) return
    this.pending.delete(testTemplateId)

    this.dispatchService.handle(testTemplateId).catch((err) => {
      this.logger.error(
        `Dispatch failed for testTemplate ${testTemplateId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    })
  }
}
