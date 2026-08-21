import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { PushNotificationService } from 'src/modules/push-notification/push-notification.service'
import { ResponsibleNotification } from 'src/modules/responsibles/entities/responsible-notification.entity'
import {
  ResponsibleNotificationSubtype,
  ResponsibleNotificationType,
} from 'src/modules/responsibles/enums/responsible-notification.enum'
import { newMessageNotificationTutores } from 'src/modules/tutor-messages/constants'
import { SendTutorMessageStatus } from 'src/modules/tutor-messages/entities/send-tutor-message.entity'
import { ConversationWindowStatus } from 'src/modules/twilio/entities/whatsapp-conversation-window.entity'
import { ConversationWindowService } from 'src/modules/twilio/services/conversation-window.service'
import { EmailService } from 'src/modules/twilio/services/email.service'
import { WhatsappService } from 'src/modules/twilio/services/whatsapp.service'
import { Connection, Repository } from 'typeorm'

import { AutomaticNotificationSend } from '../entities/automatic-notification-send.entity'
import { NotificationRuleType } from '../entities/notification-rule.entity'
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
    private readonly connection: Connection,

    private readonly pushNotificationService: PushNotificationService,
  ) {}

  async execute() {
    const BATCH_SIZE = 500
    const pending = await this.automaticNotificationSendRepository
      .createQueryBuilder('AutomaticNotificationSend')
      .select([
        'AutomaticNotificationSend.id as id',
        'AutomaticNotificationSend.statusEmail as statusEmail',
        'AutomaticNotificationSend.statusWhatsapp as statusWhatsapp',
        'AutomaticNotificationSend.statusInApp as statusInApp',
        'AutomaticNotificationSend.ruleType as ruleType',
        'AutomaticNotificationSend.data as data',
        'Student.ALU_ID as ALU_ID',
        'Student.ALU_EMAIL as ALU_EMAIL',
        'Student.ALU_WHATSAPP as ALU_WHATSAPP',
        'Student.ALU_RES_ID as ALU_RES_ID',
        'Student.ALU_NOME as ALU_NOME',
        'rule.title as title',
        'rule.content as content',
      ])
      .innerJoin('AutomaticNotificationSend.student', 'Student')
      .innerJoin('AutomaticNotificationSend.rule', 'rule')
      .where(
        '(AutomaticNotificationSend.statusEmail = :statusEmail OR AutomaticNotificationSend.statusWhatsapp = :statusWhatsapp OR AutomaticNotificationSend.statusInApp = :statusInApp)',
        {
          statusEmail: SendTutorMessageStatus.PENDENTE,
          statusWhatsapp: SendTutorMessageStatus.PENDENTE,
          statusInApp: SendTutorMessageStatus.PENDENTE,
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

      if (item.statusInApp === SendTutorMessageStatus.PENDENTE) {
        promises.push(
          this.processInApp({
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

  private async processInApp(data: IAutomaticNotificationSend): Promise<void> {
    try {
      if (!data.ALU_RES_ID) {
        await this.automaticNotificationSendRepository.update(
          { id: data.id },
          { statusInApp: SendTutorMessageStatus.NAO_ENVIADO },
        )
        return
      }

      const notification = this.connection
        .getRepository(ResponsibleNotification)
        .create({
          responsibleId: data.ALU_RES_ID,
          studentId: data.ALU_ID,
          type: ResponsibleNotificationType.DESEMPENHO,
          subtype: this.mapRuleTypeToSubtype(data.ruleType),
          title: data.title,
          content: data.content,
          automaticNotificationSendId: data.id,
        })

      const saved = await this.connection
        .getRepository(ResponsibleNotification)
        .save(notification)

      await this.automaticNotificationSendRepository.update(
        { id: data.id },
        { statusInApp: SendTutorMessageStatus.ENTREGUE },
      )

      this.pushNotificationService
        .sendToResponsible(
          data.ALU_RES_ID,
          data.title,
          newMessageNotificationTutores,
          {
            notificationId: saved.id,
            type: 'DESEMPENHO',
          },
        )
        .catch((err) =>
          this.logger.warn(
            `Push falhou para notificação ${data.id}, notificação in-app já salva`,
            err,
          ),
        )
    } catch (error) {
      this.logger.error(
        `Erro ao processar in-app para notificação ${data.id}:`,
        error,
      )
      await this.automaticNotificationSendRepository.update(
        { id: data.id },
        { statusInApp: SendTutorMessageStatus.FALHOU },
      )
    }
  }

  private mapRuleTypeToSubtype(
    ruleType: NotificationRuleType,
  ): ResponsibleNotificationSubtype {
    const mapping: Record<
      NotificationRuleType,
      ResponsibleNotificationSubtype
    > = {
      [NotificationRuleType.EXCESSO_FALTAS]:
        ResponsibleNotificationSubtype.FALTAS,
      [NotificationRuleType.RESULTADO_TESTE]:
        ResponsibleNotificationSubtype.RESULTADOS,
      [NotificationRuleType.BAIXO_RENDIMENTO]:
        ResponsibleNotificationSubtype.RENDIMENTO,
    }

    return mapping[ruleType]
  }
}
