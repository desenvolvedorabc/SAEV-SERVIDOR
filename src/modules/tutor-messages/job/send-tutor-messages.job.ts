import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ConversationWindowStatus } from 'src/modules/twilio/entities/whatsapp-conversation-window.entity'
import { ConversationWindowService } from 'src/modules/twilio/services/conversation-window.service'
import { EmailService } from 'src/modules/twilio/services/email.service'
import { WhatsappService } from 'src/modules/twilio/services/whatsapp.service'
import { Repository } from 'typeorm'

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
  ALU_EMAIL: string
  ALU_WHATSAPP: string
  ALU_NOME: string
  ESC_NOME: string
  title: string
  content: string
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
        'Student.ALU_EMAIL as ALU_EMAIL',
        'Student.ALU_WHATSAPP as ALU_WHATSAPP',
        'Student.ALU_NOME as ALU_NOME',
        'School.ESC_NOME as ESC_NOME',
      ])
      .innerJoin('SendTutorMessage.student', 'Student')
      .innerJoin('Student.ALU_ESC', 'School')
      .where(
        '(SendTutorMessage.statusEmail = :statusEmail OR SendTutorMessage.statusWhatsapp = :statusWhatsapp)',
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
}
