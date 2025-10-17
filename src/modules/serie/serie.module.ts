import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Assessment } from 'src/modules/assessment/model/entities/assessment.entity'
import { ReportsModule } from 'src/modules/reports/reports.module'

import { SerieController } from './controller/serie.controller'
import { Serie } from './model/entities/serie.entity'
import { SerieService } from './service/serie.service'

@Module({
  imports: [TypeOrmModule.forFeature([Serie, Assessment]), ReportsModule],
  providers: [SerieService],
  controllers: [SerieController],
})
export class SerieModule {}
