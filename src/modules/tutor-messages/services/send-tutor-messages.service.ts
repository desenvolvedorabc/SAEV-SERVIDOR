import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { InternalServerError } from 'src/utils/errors'
import { paginateData } from 'src/utils/paginate-data'
import { EntityManager, Repository } from 'typeorm'

import { CreateSendTutorMessageDto } from '../dto/create-send-tutor-message.dto'
import { PaginateSendTutorMessageParamsDto } from '../dto/paginate-send-tutor-message-params.dto'
import {
  SendTutorMessage,
  StatusSendTutorMessage,
} from '../entities/send-tutor-message.entity'

@Injectable()
export class SendTutorMessagesService {
  constructor(
    @InjectRepository(SendTutorMessage)
    private readonly sendTutorMessagesRepository: Repository<SendTutorMessage>,
  ) {}

  async createMany(
    { tutorMessageId, forEmail, forWpp, students }: CreateSendTutorMessageDto,
    manager: EntityManager,
  ): Promise<void> {
    const data = students.map((student) =>
      manager.getRepository(SendTutorMessage).create({
        studentId: student.ALU_ID,
        tutorMessageId,
        statusEmail:
          forEmail && student?.ALU_EMAIL?.trim()
            ? StatusSendTutorMessage.PENDENTE
            : StatusSendTutorMessage.NAO_ENVIADO,
        statusWhatsapp:
          forWpp && student?.ALU_WHATSAPP?.trim()
            ? StatusSendTutorMessage.PENDENTE
            : StatusSendTutorMessage.NAO_ENVIADO,
      }),
    )

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

  async updateStatusWhatsapp(id: number, status: StatusSendTutorMessage) {
    try {
      await this.sendTutorMessagesRepository.update(
        { id },
        { statusWhatsapp: status },
      )
    } catch (e) {
      throw new InternalServerError()
    }
  }

  async updateStatusEmail(id: number, status: StatusSendTutorMessage) {
    try {
      await this.sendTutorMessagesRepository.update(
        { id },
        { statusEmail: status },
      )
    } catch (error) {
      throw new InternalServerError()
    }
  }
}
