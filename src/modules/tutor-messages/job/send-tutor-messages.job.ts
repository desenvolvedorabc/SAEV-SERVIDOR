import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { PushNotificationService } from 'src/modules/push-notification/push-notification.service'
import { ResponsibleNotification } from 'src/modules/responsibles/entities/responsible-notification.entity'
import { ResponsibleNotificationType } from 'src/modules/responsibles/enums/responsible-notification.enum'
import { ConversationWindowStatus } from 'src/modules/twilio/entities/whatsapp-conversation-window.entity'
import { ConversationWindowService } from 'src/modules/twilio/services/conversation-window.service'
import { EmailService } from 'src/modules/twilio/services/email.service'
import { WhatsappService } from 'src/modules/twilio/services/whatsapp.service'
import { Connection, Repository } from 'typeorm'

import { newMessageNotificationTutores } from '../constants'
import {
  SendTutorMessage,
  SendTutorMessageStatus,
} from '../entities/send-tutor-message.entity'
import { TutorMessagesService } from '../services/tutor-messages.service'

interface ISendTutorMessage {
  id: number
  studentId: number
  statusEmail: SendTutorMessageStatus
  statusWhatsapp: SendTutorMessageStatus
  statusInApp: SendTutorMessageStatus
  ALU_EMAIL: string
  ALU_WHATSAPP: string
  ALU_NOME: string
  ALU_RES_ID: number
  ESC_NOME: string
  title: string
  content: string
  tutorMessageId: number
}

@Injectable()
export class SendTutorMessagesCronJob {
  private readonly logger = new Logger(SendTutorMessagesCronJob.name)

  constructor(
    @InjectRepository(SendTutorMessage)
    private readonly sendTutorMessageRepository: Repository<SendTutorMessage>,

    private readonly tutorMessagesService: TutorMessagesService,

    private readonly whatsappService: WhatsappService,

    private readonly emailService: EmailService,

    private readonly conversationWindowService: ConversationWindowService,

    private readonly connection: Connection,

    private readonly pushNotificationService: PushNotificationService,
  ) {}

  async processSendTutorMessagesPending() {
    const BATCH_SIZE = 500

    const pending = await this.sendTutorMessageRepository
      .createQueryBuilder('SendTutorMessage')
      .select([
        'SendTutorMessage.id as id',
        'SendTutorMessage.studentId as studentId',
        'SendTutorMessage.tutorMessageId as tutorMessageId',
        'SendTutorMessage.statusEmail as statusEmail',
        'SendTutorMessage.statusWhatsapp as statusWhatsapp',
        'SendTutorMessage.statusInApp as statusInApp',
        'Student.ALU_EMAIL as ALU_EMAIL',
        'Student.ALU_WHATSAPP as ALU_WHATSAPP',
        'Student.ALU_RES_ID as ALU_RES_ID',
        'Student.ALU_NOME as ALU_NOME',
        'School.ESC_NOME as ESC_NOME',
      ])
      .innerJoin('SendTutorMessage.student', 'Student')
      .innerJoin('Student.ALU_ESC', 'School')
      .where(
        '(SendTutorMessage.statusEmail = :statusEmail OR SendTutorMessage.statusWhatsapp = :statusWhatsapp OR SendTutorMessage.statusInApp = :statusInApp)',
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
      const { tutorMessage } = await this.tutorMessagesService.findOne(
        item?.tutorMessageId,
      )

      if (item.statusEmail === SendTutorMessageStatus.PENDENTE) {
        promises.push(
          this.processEmail({
            ...item,
            title: tutorMessage.title,
            content: tutorMessage.content,
          }),
        )
      }

      if (item.statusWhatsapp === SendTutorMessageStatus.PENDENTE) {
        promises.push(
          this.processWhatsapp({
            ...item,
            title: tutorMessage.title,
            content: tutorMessage.content,
          }),
        )
      }

      if (item.statusInApp === SendTutorMessageStatus.PENDENTE) {
        promises.push(
          this.processInApp({
            ...item,
            title: tutorMessage.title,
            content: tutorMessage.content,
          }),
        )
      }
    }

    await Promise.allSettled(promises)
  }

  private async processEmail(data: ISendTutorMessage): Promise<void> {
    try {
      const customArgs = {
        id: String(data.id),
        type: 'manual',
      }

      await this.emailService.send(
        data.content,
        data.title,
        data.ALU_EMAIL,
        customArgs,
      )

      await this.sendTutorMessageRepository.update(
        { id: data.id },
        { statusEmail: SendTutorMessageStatus.ENVIADO },
      )
    } catch (err) {
      this.logger.error(
        `Erro ao processar WhatsApp para ${data.ALU_NOME}:`,
        err,
      )
      await this.sendTutorMessageRepository.update(
        { id: data.id },
        { statusEmail: SendTutorMessageStatus.FALHOU },
      )
    }
  }

  private async processWhatsapp(data: ISendTutorMessage): Promise<void> {
    try {
      const statusCallback = `${process.env.HOST_APP_URL}/v1/twilio/status?id=${data.id}&type=manual`

      const hasActiveWindow =
        await this.conversationWindowService.hasActiveWindow(
          data.studentId,
          data.ALU_WHATSAPP,
        )

      if (hasActiveWindow) {
        await this.whatsappService.sendFreeFormMessage(
          data.ALU_WHATSAPP,
          data.content,
          statusCallback,
        )

        await this.sendTutorMessageRepository.update(
          { id: data.id },
          { statusWhatsapp: SendTutorMessageStatus.ENVIADO },
        )

        return
      }

      const { window, status } =
        await this.conversationWindowService.findOrCreatePendingOptIn(
          data.studentId,
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

      await this.sendTutorMessageRepository.update(
        { id: data.id },
        { statusWhatsapp: SendTutorMessageStatus.PENDENTE_JANELA },
      )
    } catch (error) {
      this.logger.error(
        `Erro ao processar WhatsApp para ${data.ALU_NOME}:`,
        error,
      )
      await this.sendTutorMessageRepository.update(
        { id: data.id },
        { statusWhatsapp: SendTutorMessageStatus.FALHOU },
      )
    }
  }

  private async processInApp(data: ISendTutorMessage): Promise<void> {
    try {
      if (!data.ALU_RES_ID) {
        await this.sendTutorMessageRepository.update(
          { id: data.id },
          { statusInApp: SendTutorMessageStatus.NAO_ENVIADO },
        )
        return
      }

      const notification = this.connection
        .getRepository(ResponsibleNotification)
        .create({
          responsibleId: data.ALU_RES_ID,
          studentId: data.studentId,
          type: ResponsibleNotificationType.COMUNICACAO,
          subtype: null,
          title: data.title,
          content: data.content,
          tutorMessageId: data.tutorMessageId,
        })

      const saved = await this.connection
        .getRepository(ResponsibleNotification)
        .save(notification)

      await this.sendTutorMessageRepository.update(
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
            type: 'COMUNICACAO',
          },
        )
        .catch((err) =>
          this.logger.warn(
            `Push falhou para ${data.ALU_NOME}, notificação in-app já salva`,
            err,
          ),
        )
    } catch (error) {
      this.logger.error(
        `Erro ao processar in-app para ${data.ALU_NOME}:`,
        error,
      )
      await this.sendTutorMessageRepository.update(
        { id: data.id },
        { statusInApp: SendTutorMessageStatus.FALHOU },
      )
    }
  }
}
