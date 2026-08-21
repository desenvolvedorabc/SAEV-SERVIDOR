import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common'

import { GoogleOidcGuard } from '../../auth/guard/google-oidc.guard'
import { ReprocessService } from '../services/reprocess.service'
import { ReprocessReconciliationService } from '../services/reprocess-reconciliation.service'
import { DispatchTaskDto } from './dto/dispatch-task.dto'
import { ExecuteTaskDto } from './dto/execute-task.dto'
import { ReprocessDispatchService } from './reprocess-dispatch.service'

@Controller('internal/reprocess')
@UseGuards(GoogleOidcGuard)
export class ReprocessInternalController {
  constructor(
    private readonly dispatchService: ReprocessDispatchService,
    private readonly reprocessService: ReprocessService,
    private readonly reconciliationService: ReprocessReconciliationService,
  ) {}

  @Post('/dispatch')
  @HttpCode(200)
  async dispatch(@Body() dto: DispatchTaskDto): Promise<{ ok: true }> {
    await this.dispatchService.handle(dto.testTemplateId)
    return { ok: true }
  }

  @Post('/execute')
  @HttpCode(200)
  async execute(@Body() dto: ExecuteTaskDto): Promise<{ ok: true }> {
    await this.reprocessService.executeReprocess(dto.jobId)
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
