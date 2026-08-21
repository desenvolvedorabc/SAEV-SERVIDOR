import { AutomaticNotificationSend } from 'src/modules/automatic-notifications/entities/automatic-notification-send.entity'
import { Student } from 'src/modules/student/model/entities/student.entity'
import { TutorMessage } from 'src/modules/tutor-messages/entities/tutor-message.entity'
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'

import {
  ResponsibleNotificationSubtype,
  ResponsibleNotificationType,
} from '../enums/responsible-notification.enum'
import { Responsible } from './responsible.entity'

@Entity({ name: 'notificacoes_responsavel' })
@Index(['responsibleId', 'readAt'])
@Index(['responsibleId', 'type', 'createdAt'])
export class ResponsibleNotification {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({ type: 'int', nullable: false })
  responsibleId: number

  @ManyToOne(() => Responsible, (responsible) => responsible.notifications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'responsibleId' })
  responsible: Responsible

  @Column({ type: 'int', nullable: false })
  studentId: number

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student

  @Column({
    type: 'enum',
    enum: ResponsibleNotificationType,
    nullable: false,
  })
  type: ResponsibleNotificationType

  @Column({
    type: 'enum',
    enum: ResponsibleNotificationSubtype,
    nullable: true,
  })
  subtype: ResponsibleNotificationSubtype

  @Column({ type: 'varchar', length: 500, nullable: false })
  title: string

  @Column({ type: 'longtext', nullable: false })
  content: string

  @Column({ type: 'int', nullable: true })
  tutorMessageId: number

  @ManyToOne(() => TutorMessage, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tutorMessageId' })
  tutorMessage: TutorMessage

  @Column({ type: 'int', nullable: true })
  automaticNotificationSendId: number

  @ManyToOne(() => AutomaticNotificationSend, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'automaticNotificationSendId' })
  automaticNotificationSend: AutomaticNotificationSend

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date
}
