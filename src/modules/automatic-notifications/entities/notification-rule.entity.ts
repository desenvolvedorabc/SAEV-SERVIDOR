import { School } from 'src/modules/school/model/entities/school.entity'
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { AutomaticNotificationSend } from './automatic-notification-send.entity'

export enum NotificationRuleType {
  BAIXO_RENDIMENTO = 'BAIXO_RENDIMENTO',
  EXCESSO_FALTAS = 'EXCESSO_FALTAS',
  RESULTADO_TESTE = 'RESULTADO_TESTE',
}

@Entity({
  name: 'regras_notificacao_automatica',
})
@Index(['schoolId'], { unique: false })
@Index(['ruleType'], { unique: false })
@Index(['schoolId', 'ruleType'], { unique: true })
export class NotificationRule {
  @PrimaryGeneratedColumn('increment', { type: 'mediumint' })
  id: number

  @Column({
    type: 'enum',
    enum: NotificationRuleType,
    nullable: false,
  })
  ruleType: NotificationRuleType

  @Column({
    type: 'boolean',
    default: true,
  })
  active: boolean

  @Column({
    type: 'varchar',
    nullable: false,
  })
  title: string

  @Column({
    type: 'longtext',
    nullable: false,
  })
  content: string

  @Column({
    type: 'json',
    nullable: true,
  })
  parameters: {
    minimumPerformance?: number
    maximumFouls?: number
  }

  @Column({ type: 'int', nullable: false })
  schoolId: number

  @ManyToOne(() => School, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'schoolId',
  })
  school: School

  @OneToMany(
    () => AutomaticNotificationSend,
    (automaticNotificationSend) => automaticNotificationSend.rule,
  )
  automaticNotifications: AutomaticNotificationSend[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
