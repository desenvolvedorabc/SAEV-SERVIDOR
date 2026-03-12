import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { County } from 'src/modules/counties/model/entities/county.entity'
import { NotificationsModule } from 'src/modules/notifications/notification.module'
import { Test } from 'src/modules/test/model/entities/test.entity'
import { User } from 'src/modules/user/model/entities/user.entity'

import { AssessmentsController } from './controller/assessment.controller'
import { Assessment } from './model/entities/assessment.entity'
import { AssessmentCounty } from './model/entities/assessment-county.entity'
import { AssessmentsService } from './service/assessment.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Assessment,
      AssessmentCounty,
      County,
      Test,
      User,
    ]),
    NotificationsModule,
  ],
  providers: [AssessmentsService],
  controllers: [AssessmentsController],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}
