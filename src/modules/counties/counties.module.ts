import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AssessmentsModule } from 'src/modules/assessment/assessment.module'
import { Assessment } from 'src/modules/assessment/model/entities/assessment.entity'
import { User } from 'src/modules/user/model/entities/user.entity'

import { StatesModule } from '../states/states.module'
import { CountiesController } from './controller/counties.controller'
import { County } from './model/entities/county.entity'
import { CountiesService } from './service/counties.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([County, User, Assessment]),
    AssessmentsModule,
    StatesModule,
  ],
  providers: [CountiesService],
  controllers: [CountiesController],
  exports: [CountiesService],
})
export class CountiesModule {}
