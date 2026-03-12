import { Student } from 'src/modules/student/model/entities/student.entity'
import { SendTutorMessageStatus } from 'src/modules/tutor-messages/entities/send-tutor-message.entity'
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { DataAutomaticNotificationSend } from '../interfaces'
import {
  NotificationRule,
  NotificationRuleType,
} from './notification-rule.entity'

@Entity({
  name: 'historico_notificacao_automatica',
})
@Index(['studentId'], { unique: false })
@Index(['statusEmail'], { unique: false })
@Index(['statusWhatsapp'], { unique: false })
@Index(['ruleType'], { unique: false })
@Index(['contextHash'], { unique: false })
@Index(['studentId', 'ruleType', 'contextHash'], {
  unique: true,
})
export class AutomaticNotificationSend {
  @PrimaryGeneratedColumn('increment', { type: 'mediumint' })
  id: number

  @Column({
    type: 'enum',
    enum: SendTutorMessageStatus,
    default: SendTutorMessageStatus.PENDENTE,
  })
  statusEmail: SendTutorMessageStatus

  @Column({
    type: 'enum',
    enum: SendTutorMessageStatus,
    default: SendTutorMessageStatus.PENDENTE,
  })
  statusWhatsapp: SendTutorMessageStatus

  @Column({
    type: 'varchar',
    nullable: false,
    comment:
      'Hash único para identificar contexto da notificação e evitar duplicatas',
  })
  contextHash: string

  @Column({
    type: 'enum',
    enum: NotificationRuleType,
    nullable: false,
  })
  ruleType: NotificationRuleType

  @Column({
    type: 'json',
    nullable: true,
  })
  data: DataAutomaticNotificationSend

  @Column({ type: 'int', nullable: false })
  studentId: number

  @Column({ type: 'int', nullable: false })
  ruleId: number

  @ManyToOne(() => Student, (student) => student.automaticNotifications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'studentId',
  })
  student: Student

  @ManyToOne(() => NotificationRule, (rule) => rule.automaticNotifications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'ruleId',
  })
  rule: NotificationRule

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
