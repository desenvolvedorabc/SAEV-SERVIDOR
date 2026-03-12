import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ConversationWindowService } from 'src/modules/twilio/services/conversation-window.service'
import { WhatsappService } from 'src/modules/twilio/services/whatsapp.service'
import { InternalServerError } from 'src/utils/errors'
import { paginateData } from 'src/utils/paginate-data'
import { EntityManager, In, Repository } from 'typeorm'

import { CreateSendTutorMessageDto } from '../dto/create-send-tutor-message.dto'
import { PaginateSendTutorMessageParamsDto } from '../dto/paginate-send-tutor-message-params.dto'
import {
  SendTutorMessage,
  SendTutorMessageStatus,
} from '../entities/send-tutor-message.entity'

@Injectable()
export class SendTutorMessagesService {
  private readonly logger = new Logger(SendTutorMessagesService.name)

  constructor(
    @InjectRepository(SendTutorMessage)
    private readonly sendTutorMessagesRepository: Repository<SendTutorMessage>,

    private readonly whatsappService: WhatsappService,
    private readonly conversationWindowService: ConversationWindowService,
  ) {}

  async createMany(
    { tutorMessageId, forEmail, forWpp, students }: CreateSendTutorMessageDto,
    manager: EntityManager,
  ): Promise<void> {
    const studentIds = students.map((s) => s.ALU_ID)
    const optedOutStudents =
      await this.conversationWindowService.getOptedOutStudents(studentIds)

    const data = students.map((student) => {
      const hasOptedOut = optedOutStudents.includes(student.ALU_ID)

      return manager.getRepository(SendTutorMessage).create({
        studentId: student.ALU_ID,
        tutorMessageId,
        statusEmail:
          forEmail && student?.ALU_EMAIL?.trim()
            ? SendTutorMessageStatus.PENDENTE
            : SendTutorMessageStatus.NAO_ENVIADO,
        statusWhatsapp:
          forWpp && student?.ALU_WHATSAPP?.trim()
            ? hasOptedOut
              ? SendTutorMessageStatus.USUARIO_RECUSOU
              : SendTutorMessageStatus.PENDENTE
            : SendTutorMessageStatus.NAO_ENVIADO,
      })
    })

    try {
      await manager.getRepository(SendTutorMessage).save(data)
    } catch (e) {
      throw new InternalServerError()
    }
  }

  async findAll({
    page,
    limit,
    tutorMessageId,
  }: PaginateSendTutorMessageParamsDto) {
    const queryBuilder = this.sendTutorMessagesRepository
      .createQueryBuilder('SendTutorMessage')
      .addSelect(['Student.ALU_NOME'])
      .innerJoin('SendTutorMessage.student', 'Student')
      .where('SendTutorMessage.tutorMessageId = :tutorMessageId', {
        tutorMessageId,
      })
      .orderBy('SendTutorMessage.statusEmail', 'ASC')
      .addOrderBy('SendTutorMessage.statusWhatsapp', 'ASC')

    return await paginateData(page, limit, queryBuilder)
  }

  async updateStatusWhatsapp(id: number, status: SendTutorMessageStatus) {
    try {
      await this.sendTutorMessagesRepository.update(
        { id },
        { statusWhatsapp: status },
      )
    } catch (e) {
      throw new InternalServerError()
    }
  }

  async updateStatusEmail(id: number, status: SendTutorMessageStatus) {
    try {
      await this.sendTutorMessagesRepository.update(
        { id },
        { statusEmail: status },
      )
    } catch (error) {
      throw new InternalServerError()
    }
  }

  async sendPendingMessages(studentId: number): Promise<number> {
    const pendingMessages = await this.sendTutorMessagesRepository
      .createQueryBuilder('SendTutorMessage')
      .select([
        'SendTutorMessage.id as id',
        'SendTutorMessage.tutorMessageId as tutorMessageId',
        'Student.ALU_WHATSAPP as ALU_WHATSAPP',
        'Student.ALU_NOME as ALU_NOME',
        'TutorMessage.content as content',
      ])
      .innerJoin('SendTutorMessage.student', 'Student')
      .innerJoin('SendTutorMessage.tutorMessage', 'TutorMessage')
      .where('SendTutorMessage.studentId = :studentId', { studentId })
      .andWhere(
        '(SendTutorMessage.statusWhatsapp = :status1 or SendTutorMessage.statusWhatsapp = :status2)',
        {
          status1: SendTutorMessageStatus.PENDENTE_JANELA,
          status2: SendTutorMessageStatus.PENDENTE,
        },
      )
      .getRawMany()

    if (!pendingMessages.length) {
      return 0
    }

    for (const message of pendingMessages) {
      try {
        const statusCallback = `${process.env.HOST_APP_URL}/v1/twilio/status?id=${message.id}&type=manual`

        await this.whatsappService.sendFreeFormMessage(
          message.ALU_WHATSAPP,
          message.content,
          statusCallback,
        )

        await this.sendTutorMessagesRepository.update(
          { id: message.id },
          { statusWhatsapp: SendTutorMessageStatus.ENVIADO },
        )
      } catch (error) {
        this.logger.error(
          `Erro ao enviar mensagem ${message.id} para estudante ${studentId}:`,
          error,
        )

        await this.sendTutorMessagesRepository.update(
          { id: message.id },
          { statusWhatsapp: SendTutorMessageStatus.FALHOU },
        )
      }
    }
  }

  async markAllAsUserRefused(studentId: number): Promise<void> {
    try {
      await this.sendTutorMessagesRepository.update(
        {
          studentId,
          statusWhatsapp: In([
            SendTutorMessageStatus.PENDENTE,
            SendTutorMessageStatus.PENDENTE_JANELA,
          ]),
        },
        { statusWhatsapp: SendTutorMessageStatus.USUARIO_RECUSOU },
      )
    } catch (error) {
      throw new InternalServerError()
    }
  }
}
