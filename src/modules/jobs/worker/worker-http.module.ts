import { Module } from '@nestjs/common'

import { JobsModule } from '../jobs.module'
import { ReprocessInternalController } from './reprocess-internal.controller'

@Module({
  imports: [JobsModule],
  controllers: [ReprocessInternalController],
})
export class WorkerHttpModule {}
