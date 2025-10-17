import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { ExternalReport } from './entities/external-report.entity'
import { ExternalReportsController } from './external-reports.controller'
import { ExternalReportsService } from './external-reports.service'

@Module({
  imports: [TypeOrmModule.forFeature([ExternalReport])],
  controllers: [ExternalReportsController],
  providers: [ExternalReportsService],
})
export class ExternalReportsModule {}
