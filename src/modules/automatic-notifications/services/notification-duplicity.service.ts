import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Student } from 'src/modules/student/model/entities/student.entity'
import { SendTutorMessageStatus } from 'src/modules/tutor-messages/entities/send-tutor-message.entity'
import { ConversationWindowService } from 'src/modules/twilio/services/conversation-window.service'
import { Connection, Repository } from 'typeorm'

import { AutomaticNotificationSend } from '../entities/automatic-notification-send.entity'
import { NotificationRuleMapper } from '../interfaces'

interface CreateAutomaticNotificationSend {
  rule: NotificationRuleMapper
  studentId: number
  phoneNumber: string
  ctx: string
  info: {
    email: string
    whatsapp: string
    month: number
    year: number
    totalFouls: number
    assessmentId: number
    assessmentName: number
    testId: number
  }
}

@Injectable()
export class NotificationDuplicityService {
  constructor(
    @InjectRepository(AutomaticNotificationSend)
    private readonly automaticNotificationSendRepository: Repository<AutomaticNotificationSend>,
    private readonly conversationWindowService: ConversationWindowService,
    private readonly connection: Connection,
  ) {}

  async isNotificationAlreadySent({
    ctx,
    rule,
    studentId,
  }: CreateAutomaticNotificationSend): Promise<boolean> {
    const existingNotification =
      await this.automaticNotificationSendRepository.findOne({
        where: {
          ruleType: rule.ruleType,
          studentId,
          contextHash: ctx,
        },
      })

    return !!existingNotification
  }

  async markNotificationSent(
    data: CreateAutomaticNotificationSend,
  ): Promise<AutomaticNotificationSend> {
    const rule = data.rule

    const hasOptedOut =
      await this.conversationWindowService.getOptedOutByStudentId(
        data.studentId,
        data.phoneNumber,
      )

    let hasResponsible = false
    if (rule?.inAppActive) {
      const student = await this.connection.getRepository(Student).findOne({
        where: { ALU_ID: data.studentId },
        select: ['ALU_ID', 'ALU_RES'],
        relations: ['ALU_RES'],
      })
      hasResponsible = !!student?.ALU_RES
    }

    const notification = this.automaticNotificationSendRepository.create({
      ruleId: rule.id,
      studentId: data.studentId,
      ruleType: rule.ruleType,
      contextHash: data.ctx,
      data: data.info,
      statusEmail:
        rule?.emailActive && data?.info?.email?.trim()
          ? SendTutorMessageStatus.PENDENTE
          : SendTutorMessageStatus.NAO_ENVIADO,
      statusWhatsapp:
        rule?.whatsappActive && data?.info?.whatsapp?.trim()
          ? hasOptedOut
            ? SendTutorMessageStatus.USUARIO_RECUSOU
            : SendTutorMessageStatus.PENDENTE
          : SendTutorMessageStatus.NAO_ENVIADO,
      statusInApp:
        rule?.inAppActive && hasResponsible
          ? SendTutorMessageStatus.PENDENTE
          : SendTutorMessageStatus.NAO_ENVIADO,
    })

    return this.automaticNotificationSendRepository.save(notification)
  }
}
