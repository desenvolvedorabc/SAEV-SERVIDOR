import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { County } from 'src/modules/counties/model/entities/county.entity'
import { Test } from 'src/modules/test/model/entities/test.entity'

import { AssessmentsController } from './controller/assessment.controller'
import { Assessment } from './model/entities/assessment.entity'
import { AssessmentCounty } from './model/entities/assessment-county.entity'
import { AssessmentsService } from './service/assessment.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([Assessment, AssessmentCounty, County, Test]),
  ],
  providers: [AssessmentsService],
  controllers: [AssessmentsController],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}
