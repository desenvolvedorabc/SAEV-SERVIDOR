import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { SendTutorMessageStatus } from 'src/modules/tutor-messages/entities/send-tutor-message.entity'
import { WhatsappService } from 'src/modules/twilio/services/whatsapp.service'
import { InternalServerError } from 'src/utils/errors'
import { In, Repository } from 'typeorm'

import { AutomaticNotificationSend } from '../entities/automatic-notification-send.entity'
import { NotificationRuleType } from '../entities/notification-rule.entity'
import { NotificationRuleMapper } from '../interfaces'
import { personalizeContent } from '../utils/personalize-content'
import { NotificationDuplicityService } from './notification-duplicity.service'
import { StudentEligibilityService } from './student-eligibility.service'

@Injectable()
export class AutomaticNotificationSendService {
  private readonly logger = new Logger(AutomaticNotificationSendService.name)

  constructor(
    @InjectRepository(AutomaticNotificationSend)
    private readonly automaticNotificationSendRepository: Repository<AutomaticNotificationSend>,

    private readonly studentEligibilityService: StudentEligibilityService,
    private readonly duplicityService: NotificationDuplicityService,
    private readonly whatsappService: WhatsappService,
  ) {}

  async updateStatusWhatsapp(id: number, status: SendTutorMessageStatus) {
    try {
      await this.automaticNotificationSendRepository.update(
        { id },
        { statusWhatsapp: status },
      )
    } catch (e) {
      throw new InternalServerError()
    }
  }

  async updateStatusEmail(id: number, status: SendTutorMessageStatus) {
    try {
      await this.automaticNotificationSendRepository.update(
        { id },
        { statusEmail: status },
      )
    } catch (error) {
      throw new InternalServerError()
    }
  }

  async processRulePerformance(rule: NotificationRuleMapper): Promise<void> {
    const { data } =
      await this.studentEligibilityService.getInfoAssessmentByRule(rule)

    if (!data?.AVM_AVA?.AVA_TES?.length) {
      return
    }

    try {
      for (const test of data.AVM_AVA.AVA_TES) {
        const eligibleStudents =
          await this.studentEligibilityService.getStudentsWithLowPerformance(
            rule,
            data.AVM_AVA,
            test,
          )

        await this.mapperStudentsEligible(rule, eligibleStudents)
      }
    } catch (error) {
      this.logger.error(`Erro ao processar regra ${rule.id}:`, error)
    }
  }

  async processRuleFouls(rule: NotificationRuleMapper): Promise<void> {
    try {
      const eligibleStudents =
        await this.studentEligibilityService.getStudentsWithExcessiveAbsences(
          rule,
        )

      await this.mapperStudentsEligible(rule, eligibleStudents)
    } catch (error) {
      this.logger.error(`Erro ao processar regra ${rule.id}:`, error)
    }
  }

  async processRuleResult(rule: NotificationRuleMapper): Promise<void> {
    const { data } =
      await this.studentEligibilityService.getInfoAssessmentByRule(rule)

    if (!data?.AVM_AVA?.AVA_ID) {
      return
    }

    try {
      const eligibleStudents =
        await this.studentEligibilityService.getStudentsWithTestResults(
          rule,
          data?.AVM_AVA,
        )

      await this.mapperStudentsEligible(rule, eligibleStudents)
    } catch (error) {
      this.logger.error(`Erro ao processar regra ${rule.id}:`, error)
    }
  }

  async processRule(rule: NotificationRuleMapper): Promise<void> {
    switch (rule.ruleType) {
      case NotificationRuleType.BAIXO_RENDIMENTO:
        return await this.processRulePerformance(rule)

      case NotificationRuleType.EXCESSO_FALTAS:
        return await this.processRuleFouls(rule)

      case NotificationRuleType.RESULTADO_TESTE:
        return await this.processRuleResult(rule)
    }
  }

  private async processStudentNotification(
    rule: NotificationRuleMapper,
    data: any,
  ): Promise<void> {
    const duplicityData = {
      ctx: data?.ctx,
      studentId: data.ALU_ID,
      phoneNumber: data.ALU_WHATSAPP,
      rule,
      info: {
        email: data?.ALU_EMAIL,
        whatsapp: data?.ALU_WHATSAPP,
        month: data?.month,
        year: data?.year,
        totalFouls: data?.totalFouls,
        assessmentId: data?.assessmentId,
        assessmentName: data?.assessmentName,
        testId: data?.testId,
      },
    }

    const alreadySent =
      await this.duplicityService.isNotificationAlreadySent(duplicityData)

    if (alreadySent) {
      return
    }

    await this.duplicityService.markNotificationSent(duplicityData)
  }

  private async mapperStudentsEligible(
    rule: NotificationRuleMapper,
    eligibleStudents: any[],
  ): Promise<any[]> {
    if (eligibleStudents?.length === 0) {
      return
    }

    await Promise.all(
      eligibleStudents?.map(async (student) => {
        await this.processStudentNotification(rule, student)
      }),
    )
  }

  async sendPendingMessages(studentId: number): Promise<number> {
    const pendingMessages = await this.automaticNotificationSendRepository
      .createQueryBuilder('AutomaticNotificationSend')
      .select([
        'AutomaticNotificationSend.id as id',
        'AutomaticNotificationSend.data as data',
        'AutomaticNotificationSend.ruleType as ruleType',
        'Student.ALU_WHATSAPP as ALU_WHATSAPP',
        'Student.ALU_NOME as ALU_NOME',
        'Student.ALU_NOME as ALU_ID',
        'rule.content as content',
        'rule.title as title',
      ])
      .innerJoin('AutomaticNotificationSend.student', 'Student')
      .innerJoin('AutomaticNotificationSend.rule', 'rule')
      .where('AutomaticNotificationSend.studentId = :studentId', { studentId })
      .andWhere(
        '(AutomaticNotificationSend.statusWhatsapp = :status1 OR AutomaticNotificationSend.statusWhatsapp = :status2)',
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
        const content = personalizeContent(message)
        const statusCallback = `${process.env.HOST_APP_URL}/v1/twilio/status?id=${message.id}&type=automatic`

        await this.whatsappService.sendFreeFormMessage(
          message.ALU_WHATSAPP,
          content,
          statusCallback,
        )

        await this.automaticNotificationSendRepository.update(
          { id: message.id },
          { statusWhatsapp: SendTutorMessageStatus.ENVIADO },
        )
      } catch (error) {
        this.logger.error(
          `Erro ao enviar notificação automática ${message.id} para estudante ${studentId}:`,
          error,
        )

        await this.automaticNotificationSendRepository.update(
          { id: message.id },
          { statusWhatsapp: SendTutorMessageStatus.FALHOU },
        )
      }
    }
  }

  async markAllAsUserRefused(studentId: number): Promise<void> {
    try {
      await this.automaticNotificationSendRepository.update(
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
