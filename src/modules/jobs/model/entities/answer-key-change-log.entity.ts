import { TestTemplate } from 'src/modules/test/model/entities/test-template.entity'
import { User } from 'src/modules/user/model/entities/user.entity'
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { AnswerKeyChangeField } from '../enums/answer-key-change-field.enum'
import { ReprocessStatus } from '../enums/reprocess-status.enum'

@Entity({ name: 'answer_key_change_log' })
export class AnswerKeyChangeLog {
  @PrimaryGeneratedColumn('increment')
  id: number

  @ManyToOne(() => TestTemplate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_template_id' })
  testTemplate: TestTemplate

  @Column({ name: 'test_template_id' })
  testTemplateId: number

  @Column('enum', { enum: AnswerKeyChangeField })
  field: AnswerKeyChangeField

  @Column({ type: 'varchar', length: 255, nullable: true })
  previousValue: string | null

  @Column({ type: 'varchar', length: 255 })
  newValue: string

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'changed_by_user_id' })
  changedByUser: User | null

  @Column({ name: 'changed_by_user_id', nullable: true })
  changedByUserId: number | null

  @Column('enum', { enum: ReprocessStatus, default: ReprocessStatus.PENDING })
  reprocessStatus: ReprocessStatus

  @Column({ type: 'timestamp', nullable: true })
  dispatchedAt: Date | null

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null

  @CreateDateColumn({ type: 'timestamp' })
  changedAt: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date
}
