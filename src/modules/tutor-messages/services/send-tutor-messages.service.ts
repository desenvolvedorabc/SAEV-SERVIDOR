import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { format } from 'date-fns'
import { ResponsibleNotification } from 'src/modules/responsibles/entities/responsible-notification.entity'
import { ConversationWindowService } from 'src/modules/twilio/services/conversation-window.service'
import { WhatsappService } from 'src/modules/twilio/services/whatsapp.service'
import { InternalServerError } from 'src/utils/errors'
import { paginateData } from 'src/utils/paginate-data'
import { Connection, EntityManager, In, Repository } from 'typeorm'

import { CreateSendTutorMessageDto } from '../dto/create-send-tutor-message.dto'
import {
  PaginateInAppDetailsParamsDto,
  PaginateSendTutorMessageParamsDto,
} from '../dto/paginate-send-tutor-message-params.dto'
import {
  SendTutorMessage,
  SendTutorMessageStatus,
} from '../entities/send-tutor-message.entity'
import { formatAverageTime } from '../helpers'

@Injectable()
export class SendTutorMessagesService {
  private readonly logger = new Logger(SendTutorMessagesService.name)

  constructor(
    @InjectRepository(SendTutorMessage)
    private readonly sendTutorMessagesRepository: Repository<SendTutorMessage>,

    private readonly whatsappService: WhatsappService,
    private readonly conversationWindowService: ConversationWindowService,
    private readonly connection: Connection,
  ) {}

  async createMany(
    {
      tutorMessageId,
      forEmail,
      forWpp,
      forInApp,
      students,
    }: CreateSendTutorMessageDto,
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
        statusInApp:
          forInApp && (student as any)?.ALU_RES_ID
            ? SendTutorMessageStatus.PENDENTE
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

  async getInAppMetrics(tutorMessageId: number) {
    const qb = this.sendTutorMessagesRepository
      .createQueryBuilder('stm')
      .select('COUNT(stm.id)', 'total')
      .addSelect(
        `SUM(CASE WHEN stm.statusInApp != :naoEnviado THEN 1 ELSE 0 END)`,
        'inAppTotal',
      )
      .addSelect(
        `COUNT(DISTINCT CASE WHEN stm.statusInApp IN (:...sent) THEN Student.ALU_RES_ID END)`,
        'notificados',
      )
      .innerJoin('stm.student', 'Student')
      .where('stm.tutorMessageId = :tutorMessageId', { tutorMessageId })
      .setParameters({
        naoEnviado: SendTutorMessageStatus.NAO_ENVIADO,
        sent: [SendTutorMessageStatus.ENVIADO, SendTutorMessageStatus.ENTREGUE],
      })

    const stmResult = await qb.getRawOne<{
      total: string
      inAppTotal: string
      notificados: string
    }>()

    const inAppTotal = Number(stmResult?.inAppTotal ?? 0)

    if (inAppTotal === 0) {
      return { visible: false }
    }

    const rnResult = await this.connection
      .getRepository(ResponsibleNotification)
      .createQueryBuilder('rn')
      .select('COUNT(CASE WHEN rn.readAt IS NOT NULL THEN 1 END)', 'readCount')
      .addSelect(
        'AVG(CASE WHEN rn.readAt IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, rn.createdAt, rn.readAt) END)',
        'avgMinutes',
      )
      .where('rn.tutorMessageId = :tutorMessageId', { tutorMessageId })
      .getRawOne<{ readCount: string; avgMinutes: string }>()

    return {
      visible: true,
      responsaveisNotificados: Number(stmResult?.notificados ?? 0),
      visualizacoes: Number(rnResult?.readCount ?? 0),
      tempoMedio: formatAverageTime(
        rnResult?.avgMinutes ? Number(rnResult.avgMinutes) : null,
      ),
    }
  }

  async findAllInAppDetails(params: PaginateInAppDetailsParamsDto) {
    const { page, limit, tutorMessageId, isCsv } = params

    const queryBuilder = this.sendTutorMessagesRepository
      .createQueryBuilder('stm')
      .select([
        'SchoolClass.TUR_ANO AS anoLetivo',
        'County.MUN_NOME AS municipio',
        'School.ESC_NOME AS escola',
        'Serie.SER_NOME AS serieAno',
        'SchoolClass.TUR_NOME AS turma',
        'Student.ALU_NOME AS aluno',
        'COALESCE(Responsible.name, Responsible.email) AS responsavel',
        'Responsible.email AS email',
        'stm.createdAt AS dataEnvio',
        'stm.statusInApp AS statusInApp',
        'rn.readAt AS dataCiencia',
        'rn.createdAt AS rnCreatedAt',
        'CASE WHEN rn.readAt IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, rn.createdAt, rn.readAt) ELSE NULL END AS tempoReacao',
      ])
      .innerJoin('stm.student', 'Student')
      .innerJoin('Student.ALU_ESC', 'School')
      .innerJoin('School.ESC_MUN', 'County')
      .leftJoin('Student.ALU_SER', 'Serie')
      .leftJoin('Student.ALU_TUR', 'SchoolClass')
      .leftJoin('Student.ALU_RES', 'Responsible')
      .leftJoin(
        ResponsibleNotification,
        'rn',
        'rn.tutorMessageId = stm.tutorMessageId AND rn.studentId = stm.studentId',
      )
      .where('stm.tutorMessageId = :tutorMessageId', { tutorMessageId })
      .andWhere('stm.statusInApp != :naoEnviado', {
        naoEnviado: SendTutorMessageStatus.NAO_ENVIADO,
      })
      .orderBy('stm.createdAt', 'DESC')

    if (isCsv) {
      const rawData = await queryBuilder.getRawMany()
      return this.mapInAppDetailsForExport(rawData)
    }

    const totalItems = await queryBuilder.getCount()
    const items = await queryBuilder
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany()

    return {
      items: this.mapInAppDetails(items),
      meta: {
        currentPage: page,
        itemCount: items.length,
        itemsPerPage: limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit) || 1,
      },
    }
  }

  private mapInAppDetails(items: any[]) {
    return items.map((item) => ({
      anoLetivo: item.anoLetivo ?? 'N/A',
      municipio: item.municipio,
      escola: item.escola,
      serieAno: item.serieAno ?? 'N/A',
      turma: item.turma ?? 'N/A',
      aluno: item.aluno,
      responsavel: item.responsavel ?? 'N/A',
      email: item.email ?? '',
      dataEnvio: item.dataEnvio
        ? format(new Date(item.dataEnvio), 'dd/MM/yyyy HH:mm')
        : '',
      statusInApp: item.statusInApp,
      cienciaRealizada: item.dataCiencia ? 'Sim' : 'Não',
      dataCiencia: item.dataCiencia
        ? format(new Date(item.dataCiencia), 'dd/MM/yyyy HH:mm')
        : '',
      tempoReacao: item.tempoReacao !== null ? Number(item.tempoReacao) : null,
    }))
  }

  private mapInAppDetailsForExport(items: any[]) {
    return this.mapInAppDetails(items).map((item) => ({
      'Ano Letivo': item.anoLetivo,
      Município: item.municipio,
      Escola: item.escola,
      'Série/Ano': item.serieAno,
      Turma: item.turma,
      Aluno: item.aluno,
      Responsável: item.responsavel,
      'E-mail': item.email,
      'Data de Envio': item.dataEnvio,
      'Ciência Realizada': item.cienciaRealizada,
      'Data da Ciência': item.dataCiencia,
      'Tempo de Reação (min)': item.tempoReacao ?? '',
    }))
  }
}
