import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { SendTutorMessageStatus } from 'src/modules/tutor-messages/entities/send-tutor-message.entity'
import { ConversationWindowStatus } from 'src/modules/twilio/entities/whatsapp-conversation-window.entity'
import { ConversationWindowService } from 'src/modules/twilio/services/conversation-window.service'
import { EmailService } from 'src/modules/twilio/services/email.service'
import { WhatsappService } from 'src/modules/twilio/services/whatsapp.service'
import { Repository } from 'typeorm'

import { AutomaticNotificationSend } from '../entities/automatic-notification-send.entity'
import { IAutomaticNotificationSend } from '../interfaces'
import { personalizeContent } from '../utils/personalize-content'

@Injectable()
export class SendAutomaticNotificationsCronJob {
  private readonly logger = new Logger(SendAutomaticNotificationsCronJob.name)

  constructor(
    @InjectRepository(AutomaticNotificationSend)
    private readonly automaticNotificationSendRepository: Repository<AutomaticNotificationSend>,

    private readonly whatsappService: WhatsappService,
    private readonly emailService: EmailService,
    private readonly conversationWindowService: ConversationWindowService,
  ) {}

  async execute() {
    const BATCH_SIZE = 500
    const pending = await this.automaticNotificationSendRepository
      .createQueryBuilder('AutomaticNotificationSend')
      .select([
        'AutomaticNotificationSend.id as id',
        'AutomaticNotificationSend.statusEmail as statusEmail',
        'AutomaticNotificationSend.statusWhatsapp as statusWhatsapp',
        'AutomaticNotificationSend.ruleType as ruleType',
        'AutomaticNotificationSend.data as data',
        'Student.ALU_ID as ALU_ID',
        'Student.ALU_EMAIL as ALU_EMAIL',
        'Student.ALU_WHATSAPP as ALU_WHATSAPP',
        'Student.ALU_NOME as ALU_NOME',
        'rule.title as title',
        'rule.content as content',
      ])
      .innerJoin('AutomaticNotificationSend.student', 'Student')
      .innerJoin('AutomaticNotificationSend.rule', 'rule')
      .where(
        '(AutomaticNotificationSend.statusEmail = :statusEmail OR AutomaticNotificationSend.statusWhatsapp = :statusWhatsapp)',
        {
          statusEmail: SendTutorMessageStatus.PENDENTE,
          statusWhatsapp: SendTutorMessageStatus.PENDENTE,
        },
      )
      .limit(BATCH_SIZE)
      .getRawMany()

    if (!pending.length) {
      return
    }

    const promises: Promise<void>[] = []

    for (const item of pending) {
      const content = personalizeContent(item)

      if (item.statusEmail === SendTutorMessageStatus.PENDENTE) {
        promises.push(
          this.processEmail({
            ...item,
            content,
          }),
        )
      }

      if (item.statusWhatsapp === SendTutorMessageStatus.PENDENTE) {
        promises.push(
          this.processWhatsapp({
            ...item,
            content,
          }),
        )
      }
    }

    await Promise.allSettled(promises)
  }

  private async processEmail(data: IAutomaticNotificationSend): Promise<void> {
    try {
      const customArgs = {
        id: String(data.id),
        type: 'automatic',
      }

      await this.emailService.send(
        data.content,
        data.title,
        data.ALU_EMAIL,
        customArgs,
      )

      await this.automaticNotificationSendRepository.update(
        { id: data.id },
        { statusEmail: SendTutorMessageStatus.ENVIADO },
      )
    } catch {
      await this.automaticNotificationSendRepository.update(
        { id: data.id },
        { statusEmail: SendTutorMessageStatus.FALHOU },
      )
    }
  }

  private async processWhatsapp(
    data: IAutomaticNotificationSend,
  ): Promise<void> {
    try {
      const statusCallback = `${process.env.HOST_APP_URL}/v1/twilio/status?id=${data.id}&type=automatic`

      const hasActiveWindow =
        await this.conversationWindowService.hasActiveWindow(
          data.ALU_ID,
          data.ALU_WHATSAPP,
        )

      if (hasActiveWindow) {
        await this.whatsappService.sendFreeFormMessage(
          data.ALU_WHATSAPP,
          data.content,
          statusCallback,
        )

        await this.automaticNotificationSendRepository.update(
          { id: data.id },
          { statusWhatsapp: SendTutorMessageStatus.ENVIADO },
        )

        return
      }

      const { window, status } =
        await this.conversationWindowService.findOrCreatePendingOptIn(
          data.ALU_ID,
          data.ALU_WHATSAPP,
        )

      if (status !== ConversationWindowStatus.PENDING_OPT_IN) {
        const result = await this.whatsappService.sendOptInTemplate(
          data.ALU_WHATSAPP,
        )

        await this.conversationWindowService.updateOptInMessageSid(
          window.id,
          result.sid,
        )
      }

      await this.automaticNotificationSendRepository.update(
        { id: data.id },
        { statusWhatsapp: SendTutorMessageStatus.PENDENTE_JANELA },
      )
    } catch (error) {
      this.logger.error(
        `Erro ao processar WhatsApp para notificação ${data.id}:`,
        error,
      )

      await this.automaticNotificationSendRepository.update(
        { id: data.id },
        { statusWhatsapp: SendTutorMessageStatus.FALHOU },
      )
    }
  }
}
