import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { PaginationParams } from 'src/helpers/params'
import { MessageTemplatesService } from 'src/modules/message-templates/message-templates.service'
import { School } from 'src/modules/school/model/entities/school.entity'
import { TypeSchoolEnum } from 'src/modules/school/model/enum/type-school.enum'
import { Student } from 'src/modules/student/model/entities/student.entity'
import { User } from 'src/modules/user/model/entities/user.entity'
import { InternalServerError } from 'src/utils/errors'
import { formatParamsByProfile } from 'src/utils/format-params-by-profile'
import { paginateData } from 'src/utils/paginate-data'
import { Connection, Repository } from 'typeorm'

import {
  CreateTutorMessageDto,
  CreateTutorMessageFiltersDto,
} from '../dto/create-tutor-message.dto'
import {
  SendTutorMessage,
  StatusSendTutorMessage,
} from '../entities/send-tutor-message.entity'
import { TutorMessage } from '../entities/tutor-message.entity'
import { SendTutorMessagesService } from './send-tutor-messages.service'

@Injectable()
export class TutorMessagesService {
  constructor(
    @InjectRepository(TutorMessage)
    private readonly tutorMessagesRepository: Repository<TutorMessage>,

    private readonly connection: Connection,

    private readonly sendTutorMessagesService: SendTutorMessagesService,
    private readonly messageTemplatesService: MessageTemplatesService,
  ) {}

  async create(dto: CreateTutorMessageDto) {
    const schoolId: number = dto?.filters?.schoolId

    const { activeEmail, activeWpp } =
      await this.verifyCountyWppOrEmailActive(schoolId)

    const forWpp = activeWpp && !!dto?.forWpp
    const forEmail = activeEmail && !!dto?.forEmail

    if (!forWpp && !forEmail) {
      throw new ForbiddenException('Selecione um canal ativo.')
    }

    const { students } = await this.getStudents(dto.filters)

    if (!students.length) {
      throw new NotFoundException('Nenhum aluno encontrado')
    }

    const queryRunner = this.connection.createQueryRunner()

    await queryRunner.connect()
    await queryRunner.startTransaction()

    let messageTemplate = queryRunner.manager
      .getRepository(TutorMessage)
      .create({ ...dto, schoolId })

    try {
      messageTemplate = await queryRunner.manager
        .getRepository(TutorMessage)
        .save(messageTemplate)

      await this.sendTutorMessagesService.createMany(
        {
          students,
          tutorMessageId: messageTemplate.id,
          forEmail,
          forWpp,
        },
        queryRunner.manager,
      )

      await queryRunner.commitTransaction()

      if (dto.newTemplate)
        this.messageTemplatesService.create(
          {
            title: dto.title,
            content: dto.content,
          },
          schoolId,
        )
    } catch (e) {
      await queryRunner.rollbackTransaction()
      throw new InternalServerError()
    } finally {
      await queryRunner.release()
    }
  }

  async findAll(dto: PaginationParams, user: User) {
    const {
      page,
      limit,
      search,
      stateId,
      county,
      school,
      typeSchool,
      verifyProfileForState,
      date,
    } = formatParamsByProfile(dto, user)

    const queryBuilder = this.tutorMessagesRepository
      .createQueryBuilder('TutorMessage')
      .select([
        'TutorMessage.id',
        'TutorMessage.title',
        'TutorMessage.content',
        'TutorMessage.createdAt',
      ])
      .leftJoin('TutorMessage.school', 'School')
      .orderBy('TutorMessage.createdAt', 'DESC')

    if (typeSchool) {
      queryBuilder.andWhere('School.ESC_TIPO = :typeSchool', {
        typeSchool,
      })
    }

    if (school) {
      queryBuilder.andWhere('TutorMessage.schoolId = :schoolId', {
        schoolId: school,
      })
    }

    if (county) {
      queryBuilder.andWhere('School.ESC_MUN_ID = :countyId', {
        countyId: county,
      })
    }

    if (stateId) {
      queryBuilder.innerJoin(
        'School.ESC_MUN',
        'county',
        'county.stateId = :stateId',
        {
          stateId,
        },
      )
    }

    if (verifyProfileForState) {
      queryBuilder.andWhere('School.ESC_TIPO = :typeSchool', {
        typeSchool: TypeSchoolEnum.ESTADUAL,
      })
    }

    if (search) {
      queryBuilder.andWhere('TutorMessage.title LIKE :q', {
        q: `%${search}%`,
      })
    }

    if (date) {
      queryBuilder.andWhere('DATE(TutorMessage.createdAt) = :date', {
        date,
      })
    }

    const data = await paginateData(page, limit, queryBuilder)

    const mapperItems = await Promise.all(
      data?.items?.map(async (tutorMessage) => {
        const status = await this.getStatusSendTutorMessages(tutorMessage.id)

        return {
          ...tutorMessage,
          status,
        }
      }),
    )

    return {
      ...data,
      items: mapperItems,
    }
  }

  async findOne(id: number) {
    const tutorMessage = await this.tutorMessagesRepository.findOne({
      where: { id },
    })

    if (!tutorMessage) {
      throw new NotFoundException(`Mensagem com o ${id} não encontrada.`)
    }

    delete tutorMessage?.filters

    return { tutorMessage }
  }

  async getStudents({
    genderId,
    schoolClassIds,
    schoolId,
    serieIds,
    studentIds,
    active,
  }: CreateTutorMessageFiltersDto) {
    const queryBuilder = this.connection
      .getRepository(Student)
      .createQueryBuilder('Students')
      .select([
        'Students.ALU_ID as ALU_ID',
        'Students.ALU_EMAIL as ALU_EMAIL',
        'Students.ALU_WHATSAPP as ALU_WHATSAPP',
      ])
      .where(
        "((Students.ALU_EMAIL IS NOT NULL and Students.ALU_EMAIL != '') or (Students.ALU_WHATSAPP IS NOT NULL and Students.ALU_WHATSAPP != ''))",
      )

    if (studentIds && studentIds.length > 0) {
      queryBuilder.andWhere('Students.ALU_ID IN (:...studentIds)', {
        studentIds,
      })

      const students = await queryBuilder.getRawMany()

      return {
        students,
      }
    }

    if (schoolId) {
      queryBuilder.andWhere('Students.ALU_ESC_ID = :schoolId', { schoolId })
    }

    if (genderId) {
      queryBuilder.andWhere('Students.ALU_GEN_ID = :genderId', { genderId })
    }

    if (schoolClassIds?.length) {
      queryBuilder.andWhere('Students.ALU_TUR_ID IN (:...schoolClassIds)', {
        schoolClassIds,
      })
    }

    if (serieIds?.length) {
      queryBuilder.andWhere('Students.ALU_SER_ID IN (:...serieIds)', {
        serieIds,
      })
    }

    if (active !== null) {
      queryBuilder.andWhere('Students.ALU_ATIVO = :active', { active })
    }

    const students = await queryBuilder.getRawMany()

    return {
      students,
    }
  }

  private async getStatusSendTutorMessages(tutorMessageId: number) {
    const verifyStudentsPending =
      await this.getSendTutorMessagePending(tutorMessageId)

    if (verifyStudentsPending) {
      return 'pending'
    }

    const verifyStudentsFail =
      await this.getSendTutorMessageFail(tutorMessageId)

    if (verifyStudentsFail) {
      return 'fail'
    }

    return 'send'
  }

  private async verifyCountyWppOrEmailActive(schoolId: number) {
    const school = await this.connection.getRepository(School).findOne({
      where: {
        ESC_ID: schoolId,
      },
      relations: ['ESC_MUN'],
    })

    const county = school?.ESC_MUN

    if (!county) {
      throw new NotFoundException('Município não encontrado')
    }

    if (
      !county?.MUN_MENSAGEM_EMAIL_ATIVO &&
      !county?.MUN_MENSAGEM_WHATSAPP_ATIVO
    ) {
      throw new ForbiddenException(
        'Município sem configuração de envio de mensagens',
      )
    }

    return {
      activeWpp: county.MUN_MENSAGEM_WHATSAPP_ATIVO,
      activeEmail: county.MUN_MENSAGEM_EMAIL_ATIVO,
    }
  }

  private async getSendTutorMessagePending(tutorMessageId: number) {
    const sendTutorMessage = await this.connection
      .getRepository(SendTutorMessage)
      .createQueryBuilder('SendTutorMessage')
      .select(['SendTutorMessage.id as id'])
      .where('SendTutorMessage.tutorMessageId = :tutorMessageId', {
        tutorMessageId,
      })
      .andWhere(
        '(SendTutorMessage.statusEmail = :statusEmail OR SendTutorMessage.statusWhatsapp = :statusWhatsapp)',
        {
          statusEmail: StatusSendTutorMessage.PENDENTE,
          statusWhatsapp: StatusSendTutorMessage.PENDENTE,
        },
      )
      .getRawOne()

    return sendTutorMessage
  }

  private async getSendTutorMessageFail(tutorMessageId: number) {
    const sendTutorMessage = await this.connection
      .getRepository(SendTutorMessage)
      .createQueryBuilder('SendTutorMessage')
      .select(['SendTutorMessage.id as id'])
      .where('SendTutorMessage.tutorMessageId = :tutorMessageId', {
        tutorMessageId,
      })
      .andWhere(
        `((SendTutorMessage.statusEmail = '${StatusSendTutorMessage.FALHOU}' and SendTutorMessage.statusWhatsapp = '${StatusSendTutorMessage.FALHOU}')
          or (SendTutorMessage.statusEmail = '${StatusSendTutorMessage.NAO_ENVIADO}' and SendTutorMessage.statusWhatsapp = '${StatusSendTutorMessage.FALHOU}')
          or (SendTutorMessage.statusEmail = '${StatusSendTutorMessage.FALHOU}' and SendTutorMessage.statusWhatsapp = '${StatusSendTutorMessage.NAO_ENVIADO}')
        )`,
      )
      .getRawOne()

    return sendTutorMessage
  }
}
