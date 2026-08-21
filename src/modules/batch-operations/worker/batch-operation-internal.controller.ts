import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common'

import { GoogleOidcGuard } from '../../auth/guard/google-oidc.guard'
import { BatchOperationExecutorService } from '../service/batch-operation-executor.service'
import { BatchOperationReconciliationService } from '../service/batch-operation-reconciliation.service'
import { ExecuteBatchOperationDto } from './dto/execute-batch-operation.dto'

@Controller('/internal/batch-operations')
@UseGuards(GoogleOidcGuard)
export class BatchOperationInternalController {
  constructor(
    private readonly executor: BatchOperationExecutorService,
    private readonly reconciliationService: BatchOperationReconciliationService,
  ) {}

  @Post('/execute')
  @HttpCode(200)
  async execute(@Body() dto: ExecuteBatchOperationDto): Promise<{ ok: true }> {
    await this.executor.execute(dto.operationId)
    return { ok: true }
  }

  @Post('/reconcile')
  @HttpCode(200)
  async reconcile(): Promise<{
    ok: true
    scanned: number
    rescheduled: number
    failed: number
  }> {
    const result = await this.reconciliationService.reconcile()
    return { ok: true, ...result }
  }
}
