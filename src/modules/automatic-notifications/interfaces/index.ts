import { TypeSchoolEnum } from 'src/modules/school/model/enum/type-school.enum'
import { SendTutorMessageStatus } from 'src/modules/tutor-messages/entities/send-tutor-message.entity'

import { NotificationRuleType } from '../entities/notification-rule.entity'

export interface NotificationRuleMapper {
  id: number
  ruleType: NotificationRuleType
  active: boolean
  title: string
  content: string
  parameters: {
    minimumPerformance?: number
    maximumFouls?: number
  }
  schoolId: number
  countyId: number
  typeSchool: TypeSchoolEnum
  whatsappActive: boolean
  emailActive: boolean
  date: Date
}

export interface IAutomaticNotificationSend {
  id: number
  statusEmail: SendTutorMessageStatus
  statusWhatsapp: SendTutorMessageStatus
  ruleType: NotificationRuleType
  data: DataAutomaticNotificationSend
  ALU_ID: number
  ALU_EMAIL: string
  ALU_WHATSAPP: string
  ALU_NOME: string
  title: string
  content: string
}

export interface DataAutomaticNotificationSend {
  email: string
  whatsapp: string
  month?: number
  year?: number
  totalFouls?: number
  assessmentId?: number
  assessmentName?: number
  testId?: number
}
