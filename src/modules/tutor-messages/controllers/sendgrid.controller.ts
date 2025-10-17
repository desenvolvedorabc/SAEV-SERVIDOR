import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Post,
} from '@nestjs/common'

import { SendGridEvent } from '../interfaces/sendgrid.interface'
import { SendTutorMessagesService } from '../services/send-tutor-messages.service'
import { mapSendGridEventToStatus } from '../utils/mapper-sendgrid-status'

@Controller('sendgrid')
export class SendGridController {
  constructor(
    private readonly sendTutorMessagesService: SendTutorMessagesService,
  ) {}

  @Post('/webhook')
  async webhook(
    @Headers('x-twilio-email-event-webhook-signature') signature: string,
    @Headers('x-twilio-email-event-webhook-timestamp') timestamp: string,
    @Body() events: SendGridEvent[],
  ) {
    if (!signature || !timestamp) {
      throw new ForbiddenException('Missing signature or timestamp')
    }

    const event = events[0]
    const sendTutorMessageId = Number(event?.sendTutorMessageId)

    if (!sendTutorMessageId) {
      return
    }

    const status = mapSendGridEventToStatus(event?.event)

    if (!status) {
      return
    }

    return this.sendTutorMessagesService.updateStatusEmail(
      sendTutorMessageId,
      status,
    )
  }
}
