import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import {
  SendTutorMessage,
  StatusSendTutorMessage,
} from '../entities/send-tutor-message.entity'
import { EmailService } from '../services/email.service'
import { TutorMessagesService } from '../services/tutor-messages.service'
import { WhatsappService } from '../services/whatsapp.service'

interface ISendTutorMessage {
  id: number
  statusEmail: StatusSendTutorMessage
  statusWhatsapp: StatusSendTutorMessage
  ALU_EMAIL: string
  ALU_WHATSAPP: string
  ALU_NOME: string
  title: string
  content: string
}

@Injectable()
export class SendTutorMessagesCronJob {
  constructor(
    @InjectRepository(SendTutorMessage)
    private readonly sendTutorMessageRepository: Repository<SendTutorMessage>,

    private readonly tutorMessagesService: TutorMessagesService,

    private readonly whatsappService: WhatsappService,

    private readonly emailService: EmailService,
  ) {}

  async processSendTutorMessagesPending() {
    const pending = await this.sendTutorMessageRepository
      .createQueryBuilder('SendTutorMessage')
      .select([
        'SendTutorMessage.id as id',
        'SendTutorMessage.tutorMessageId as tutorMessageId',
        'SendTutorMessage.statusEmail as statusEmail',
        'SendTutorMessage.statusWhatsapp as statusWhatsapp',
        'Student.ALU_EMAIL as ALU_EMAIL',
        'Student.ALU_WHATSAPP as ALU_WHATSAPP',
        'Student.ALU_NOME as ALU_NOME',
      ])
      .innerJoin('SendTutorMessage.student', 'Student')
      .where(
        '(SendTutorMessage.statusEmail = :statusEmail OR SendTutorMessage.statusWhatsapp = :statusWhatsapp)',
        {
          statusEmail: StatusSendTutorMessage.PENDENTE,
          statusWhatsapp: StatusSendTutorMessage.PENDENTE,
        },
      )
      .limit(500)
      .getRawMany()

    if (!pending.length) {
      return
    }

    const { tutorMessage } = await this.tutorMessagesService.findOne(
      pending[0]?.tutorMessageId,
    )

    const promises: Promise<void>[] = []

    for (const item of pending) {
      if (item.statusEmail === StatusSendTutorMessage.PENDENTE) {
        promises.push(
          this.processEmail({
            ...item,
            title: tutorMessage.title,
            content: tutorMessage.content,
          }),
        )
      }

      if (item.statusWhatsapp === StatusSendTutorMessage.PENDENTE) {
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
      await this.emailService.send(
        data.id,
        data.content,
        data.title,
        data.ALU_EMAIL,
      )

      await this.sendTutorMessageRepository.update(
        { id: data.id },
        { statusEmail: StatusSendTutorMessage.ENVIADO },
      )
    } catch {
      await this.sendTutorMessageRepository.update(
        { id: data.id },
        { statusEmail: StatusSendTutorMessage.FALHOU },
      )
    }
  }

  private async processWhatsapp(data: ISendTutorMessage): Promise<void> {
    try {
      await this.whatsappService.send(data.ALU_WHATSAPP, data.content, data.id)

      await this.sendTutorMessageRepository.update(
        { id: data.id },
        { statusWhatsapp: StatusSendTutorMessage.ENVIADO },
      )
    } catch {
      await this.sendTutorMessageRepository.update(
        { id: data.id },
        { statusWhatsapp: StatusSendTutorMessage.FALHOU },
      )
    }
  }
}
