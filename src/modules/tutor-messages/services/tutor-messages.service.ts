import {
  ForbiddenException,
  forwardRef,
  Inject,
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
  SendTutorMessageStatus,
} from '../entities/send-tutor-message.entity'
import { TutorMessage } from '../entities/tutor-message.entity'
import {
  AggregatedTutorMessageStatus,
  decideChannelStatus,
  decideFinalStatus,
} from '../helpers'
import { SendTutorMessagesService } from './send-tutor-messages.service'

@Injectable()
export class TutorMessagesService {
  constructor(
    @InjectRepository(TutorMessage)
    private readonly tutorMessagesRepository: Repository<TutorMessage>,

    @Inject(forwardRef(() => SendTutorMessagesService))
    private readonly sendTutorMessagesService: SendTutorMessagesService,

    private readonly messageTemplatesService: MessageTemplatesService,

    private readonly connection: Connection,
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
        const { status, metrics } = await this.getStatusSendTutorMessages(
          tutorMessage.id,
        )

        return {
          ...tutorMessage,
          status,
          metrics,
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

  async getStatusSendTutorMessages(tutorMessageId: number): Promise<{
    status: AggregatedTutorMessageStatus
    metrics: {
      email: {
        pending: number
        sent: number
        fail: number
        notSent: number
        status: string
        total: number
      }
      whatsapp: {
        pending: number
        sent: number
        fail: number
        notSent: number
        status: string
        total: number
      }
    }
  }> {
    const qb = this.connection
      .getRepository(SendTutorMessage)
      .createQueryBuilder('stm')
      .select('COUNT(stm.id)', 'total')
      .addSelect(
        `SUM(CASE WHEN stm.statusEmail IN (:...pending) THEN 1 ELSE 0 END)`,
        'email_pending',
      )
      .addSelect(
        `SUM(CASE WHEN stm.statusEmail IN (:...sent) THEN 1 ELSE 0 END)`,
        'email_sent',
      )
      .addSelect(
        `SUM(CASE WHEN stm.statusEmail = :f THEN 1 ELSE 0 END)`,
        'email_fail',
      )
      .addSelect(
        `SUM(CASE WHEN stm.statusEmail IN (:...n) THEN 1 ELSE 0 END)`,
        'email_not_sent',
      )
      .addSelect(
        `SUM(CASE WHEN stm.statusWhatsapp IN (:...pending) THEN 1 ELSE 0 END)`,
        'wa_pending',
      )
      .addSelect(
        `SUM(CASE WHEN stm.statusWhatsapp IN (:...sent) THEN 1 ELSE 0 END)`,
        'wa_sent',
      )
      .addSelect(
        `SUM(CASE WHEN stm.statusWhatsapp = :f THEN 1 ELSE 0 END)`,
        'wa_fail',
      )
      .addSelect(
        `SUM(CASE WHEN stm.statusWhatsapp IN (:...n) THEN 1 ELSE 0 END)`,
        'wa_not_sent',
      )

      .where('stm.tutorMessageId = :id', { id: tutorMessageId })
      .setParameters({
        pending: [
          SendTutorMessageStatus.PENDENTE,
          SendTutorMessageStatus.PENDENTE_JANELA,
        ],
        f: SendTutorMessageStatus.FALHOU,
        n: [
          SendTutorMessageStatus.NAO_ENVIADO,
          SendTutorMessageStatus.USUARIO_RECUSOU,
        ],
        sent: [SendTutorMessageStatus.ENVIADO, SendTutorMessageStatus.ENTREGUE],
      })

    const r = await qb.getRawOne<{
      total: string
      email_pending: string
      email_sent: string
      email_fail: string
      email_not_sent: string
      wa_pending: string
      wa_sent: string
      wa_fail: string
      wa_not_sent: string
    }>()

    const total = Number(r?.total ?? 0)

    const emailCounts = {
      pending: Number(r?.email_pending ?? 0),
      sent: Number(r?.email_sent ?? 0),
      fail: Number(r?.email_fail ?? 0),
      notSent: Number(r?.email_not_sent ?? 0),
      total,
    }
    const waCounts = {
      pending: Number(r?.wa_pending ?? 0),
      sent: Number(r?.wa_sent ?? 0),
      fail: Number(r?.wa_fail ?? 0),
      notSent: Number(r?.wa_not_sent ?? 0),
      total,
    }

    const emailStatus = decideChannelStatus(emailCounts)
    const waStatus = decideChannelStatus(waCounts)
    const finalStatus = decideFinalStatus(emailStatus, waStatus)

    return {
      status: finalStatus,
      metrics: {
        email: { ...emailCounts, status: emailStatus },
        whatsapp: { ...waCounts, status: waStatus },
      },
    }
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
}
