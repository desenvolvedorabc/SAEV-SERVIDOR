import { forwardRef, Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { TypeOrmModule } from '@nestjs/typeorm'
import { StudentTest } from 'src/modules/release-results/model/entities/student-test.entity'
import { SchoolAbsence } from 'src/modules/school-absences/model/entities/school-absences.entity'
import { Student } from 'src/modules/student/model/entities/student.entity'

import { TwilioModule } from '../twilio/twilio.module'
import { AutomaticNotificationsController } from './controllers/automatic-notifications.controller'
import { CronAutomaticNotificationsController } from './controllers/cron-automatic-notifications.controller'
import { NotificationRulesController } from './controllers/notification-rules.controller'
import { AutomaticNotificationSend } from './entities/automatic-notification-send.entity'
import { NotificationRule } from './entities/notification-rule.entity'
import { AutomaticNotificationsCronJob } from './jobs/automatic-notifications-cron.job'
import { SendAutomaticNotificationsCronJob } from './jobs/send-automatic-notifications.job'
import { AutomaticNotificationSendService } from './services/automatic-notification-send.service'
import { AutomaticNotificationsService } from './services/automatic-notifications.service'
import { NotificationDuplicityService } from './services/notification-duplicity.service'
import { NotificationRulesService } from './services/notification-rules.service'
import { StudentEligibilityService } from './services/student-eligibility.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationRule,
      AutomaticNotificationSend,
      Student,
      SchoolAbsence,
      StudentTest,
    ]),
    ScheduleModule.forRoot(),
    forwardRef(() => TwilioModule),
  ],
  controllers: [
    NotificationRulesController,
    AutomaticNotificationsController,
    CronAutomaticNotificationsController,
  ],
  providers: [
    NotificationRulesService,
    AutomaticNotificationSendService,
    StudentEligibilityService,
    NotificationDuplicityService,
    AutomaticNotificationsCronJob,
    SendAutomaticNotificationsCronJob,
    AutomaticNotificationsService,
  ],
  exports: [NotificationRulesService, AutomaticNotificationSendService],
})
export class AutomaticNotificationsModule {}
