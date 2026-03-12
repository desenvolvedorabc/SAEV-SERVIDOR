import {
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'

import { AutomaticNotificationsCronJob } from '../jobs/automatic-notifications-cron.job'
import { SendAutomaticNotificationsCronJob } from '../jobs/send-automatic-notifications.job'

@Controller('cron-automatic-notifications')
@ApiBearerAuth()
export class CronAutomaticNotificationsController {
  constructor(
    private readonly automaticNotificationsCronJob: AutomaticNotificationsCronJob,
    private readonly sendAutomaticNotificationsCronJob: SendAutomaticNotificationsCronJob,
  ) {}

  @Post('/fouls')
  cronFouls(@Headers('Cron-Job-Id') cronJobId: string) {
    if (cronJobId !== process.env.CRON_JOB_ID) {
      throw new UnauthorizedException()
    }

    this.automaticNotificationsCronJob.processAutomaticNotificationsFouls()

    return {
      ok: true,
    }
  }

  @Post('/performance')
  cronPerformance(@Headers('Cron-Job-Id') cronJobId: string) {
    if (cronJobId !== process.env.CRON_JOB_ID) {
      throw new UnauthorizedException()
    }

    this.automaticNotificationsCronJob.processAutomaticNotificationsPerformance()

    return {
      ok: true,
    }
  }

  @Post('/results')
  cronResults(@Headers('Cron-Job-Id') cronJobId: string) {
    if (cronJobId !== process.env.CRON_JOB_ID) {
      throw new UnauthorizedException()
    }

    this.automaticNotificationsCronJob.processAutomaticNotificationsResults()

    return {
      ok: true,
    }
  }

  @Post('/send')
  cronSendPending(@Headers('Cron-Job-Id') cronJobId: string) {
    if (cronJobId !== process.env.CRON_JOB_ID) {
      throw new UnauthorizedException()
    }

    this.sendAutomaticNotificationsCronJob.execute()

    return {
      ok: true,
    }
  }
}
