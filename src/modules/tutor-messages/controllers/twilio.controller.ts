import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Post,
  Query,
} from '@nestjs/common'

import { TwilioStatusCallbackParamsDto } from '../dto/twilio-status-callback-params.dto'
import { StatusSendTutorMessage } from '../entities/send-tutor-message.entity'
import { SendTutorMessagesService } from '../services/send-tutor-messages.service'
import { mapTwilioToTutorStatus } from '../utils/mapper-twilio-status'

@Controller('twilio')
export class TwilioController {
  constructor(
    private readonly sendTutorMessagesService: SendTutorMessagesService,
  ) {}

  @Post('/status')
  statusCallback(
    @Headers('x-twilio-signature') signature: string,
    @Body() body: any,
    @Query() params: TwilioStatusCallbackParamsDto,
  ) {
    if (!signature) {
      throw new ForbiddenException('Invalid signature')
    }

    const { MessageStatus } = body

    const status: StatusSendTutorMessage = mapTwilioToTutorStatus(MessageStatus)

    if (!status) {
      throw new BadRequestException('Invalid message status')
    }

    return this.sendTutorMessagesService.updateStatusWhatsapp(
      params.sendTutorMessageId,
      status,
    )
  }
}
