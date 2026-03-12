import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Post,
} from '@nestjs/common'
import { AutomaticNotificationSendService } from 'src/modules/automatic-notifications/services/automatic-notification-send.service'
import { SendTutorMessagesService } from 'src/modules/tutor-messages/services/send-tutor-messages.service'

import { SendGridEvent } from '../interfaces/sendgrid.interface'
import { mapSendGridEventToStatus } from '../utils/mapper-sendgrid-status'

@Controller('sendgrid')
export class SendGridController {
  constructor(
    private readonly sendTutorMessagesService: SendTutorMessagesService,
    private readonly automaticNotificationService: AutomaticNotificationSendService,
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
    const id = Number(event?.id)
    const type = event?.type

    if (!id) {
      return
    }

    const status = mapSendGridEventToStatus(event?.event)

    if (!status) {
      return
    }

    if (type === 'automatic') {
      return this.automaticNotificationService.updateStatusEmail(id, status)
    }

    return this.sendTutorMessagesService.updateStatusEmail(id, status)
  }
}
