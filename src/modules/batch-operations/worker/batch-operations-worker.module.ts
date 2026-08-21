import { Module } from '@nestjs/common'

import { BatchOperationsModule } from '../batch-operations.module'
import { BatchOperationInternalController } from './batch-operation-internal.controller'

@Module({
  imports: [BatchOperationsModule],
  controllers: [BatchOperationInternalController],
})
export class BatchOperationsWorkerModule {}
