import {
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'

import { SendTutorMessagesCronJob } from '../job/send-tutor-messages.job'

@Controller('cron-tutor-messages')
@ApiBearerAuth()
export class CronTutorMessagesController {
  constructor(
    private readonly sendTutorMessagesCronJob: SendTutorMessagesCronJob,
  ) {}

  @Post('/')
  create(@Headers('Cron-Job-Id') cronJobId: string) {
    if (cronJobId !== process.env.CRON_JOB_ID) {
      throw new UnauthorizedException()
    }

    this.sendTutorMessagesCronJob.processSendTutorMessagesPending()

    return {
      ok: true,
    }
  }
}
