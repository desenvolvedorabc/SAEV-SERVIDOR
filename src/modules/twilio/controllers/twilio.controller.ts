import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Headers,
  Logger,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AutomaticNotificationSendService } from 'src/modules/automatic-notifications/services/automatic-notification-send.service'
import { SendTutorMessageStatus } from 'src/modules/tutor-messages/entities/send-tutor-message.entity'
import { SendTutorMessagesService } from 'src/modules/tutor-messages/services/send-tutor-messages.service'

import { TwilioStatusCallbackParamsDto } from '../dto/twilio-status-callback-params.dto'
import { TwilioSignatureGuard } from '../guards/twilio-signature.guard'
import { TwilioIncoming } from '../interfaces/twilio-incoming.interface'
import { ConversationWindowService } from '../services/conversation-window.service'
import { mapTwilioToTutorStatus } from '../utils/mapper-twilio-status'

@Controller('twilio')
@ApiTags('Twilio')
export class TwilioController {
  private readonly logger = new Logger(TwilioController.name)

  constructor(
    private readonly sendTutorMessagesService: SendTutorMessagesService,
    private readonly automaticNotificationService: AutomaticNotificationSendService,
    private readonly conversationWindowService: ConversationWindowService,
  ) {}

  @Post('/status')
  @UseGuards(TwilioSignatureGuard)
  statusCallback(
    @Body() body: any,
    @Query() params: TwilioStatusCallbackParamsDto,
  ) {
    const { MessageStatus } = body

    const status: SendTutorMessageStatus = mapTwilioToTutorStatus(MessageStatus)

    if (!status) {
      throw new BadRequestException('Invalid message status')
    }

    if (params.type === 'automatic') {
      return this.automaticNotificationService.updateStatusWhatsapp(
        params.id,
        status,
      )
    }

    return this.sendTutorMessagesService.updateStatusWhatsapp(params.id, status)
  }

  @Post('/incoming')
  @UseGuards(TwilioSignatureGuard)
  async incomingMessage(@Body() body: any) {
    const twilioIncoming: TwilioIncoming = body

    if (!twilioIncoming.ButtonPayload) {
      throw new BadRequestException('Invalid incoming message')
    }

    const originalMessageSid = twilioIncoming.OriginalRepliedMessageSid

    if (twilioIncoming.ButtonPayload === 'nao_quero_receber') {
      const { window } =
        await this.conversationWindowService.optOut(originalMessageSid)

      if (window) {
        await Promise.all([
          this.sendTutorMessagesService.markAllAsUserRefused(window.studentId),
          this.automaticNotificationService.markAllAsUserRefused(
            window.studentId,
          ),
        ])
      }
      return {
        success: true,
      }
    }

    const window =
      await this.conversationWindowService.openWindow(originalMessageSid)

    if (window) {
      await Promise.all([
        this.sendTutorMessagesService.sendPendingMessages(window.studentId),
        this.automaticNotificationService.sendPendingMessages(window.studentId),
      ])
    }

    return {
      success: true,
    }
  }

  @Delete('/cleanup/opted-out-windows')
  async cleanupOptedOutWindows(@Headers('Cron-Job-Id') cronJobId: string) {
    if (cronJobId !== process.env.CRON_JOB_ID) {
      throw new UnauthorizedException()
    }

    const deletedCount =
      await this.conversationWindowService.deleteOptedOutWindowsOlderThan90Days()

    return {
      deletedCount,
    }
  }
}
