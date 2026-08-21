import { Injectable, Logger } from '@nestjs/common'

import { BatchOperationExecutorService } from '../service/batch-operation-executor.service'
import { BatchOperationDispatcher } from './batch-operation-dispatcher.interface'

/**
 * Fallback de desenvolvimento: executa a operação no próprio processo via
 * setImmediate (sem Cloud Tasks). Espelha o InProcessReprocessDispatcher.
 */
@Injectable()
export class InProcessBatchOperationDispatcher
  implements BatchOperationDispatcher
{
  private readonly logger = new Logger(InProcessBatchOperationDispatcher.name)

  constructor(private readonly executor: BatchOperationExecutorService) {}

  async scheduleExecute(operationId: number): Promise<void> {
    setImmediate(() => {
      this.executor.execute(operationId).catch((err) => {
        this.logger.error(
          `Batch operation ${operationId} failed (in-process): ${
            err instanceof Error ? err.message : String(err)
          }`,
        )
      })
    })
  }
}
