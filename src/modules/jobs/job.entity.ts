import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { JobType } from './job-type.enum'
import { AnswerKeyChangeLog } from './model/entities/answer-key-change-log.entity'
import { JobStatus } from './model/enums/job-status.enum'

@Entity()
export class Job {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column()
  assessmentId?: number

  @Column()
  countyId?: number

  @Column()
  bullId: string

  @Column('enum', { enum: JobType })
  jobType: JobType

  @Column()
  startDate: Date

  @Column()
  endDate: Date

  @Column('enum', { enum: JobStatus, default: JobStatus.PENDING })
  status: JobStatus

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null

  @Column({ type: 'int', default: 0 })
  retryCount: number

  @ManyToOne(() => AnswerKeyChangeLog, { nullable: true })
  @JoinColumn({ name: 'triggered_by_change_log_id' })
  triggeredByChangeLog: AnswerKeyChangeLog | null

  @Column({ name: 'triggered_by_change_log_id', nullable: true })
  triggeredByChangeLogId: number | null

  @Column('simple-array', { nullable: true })
  affectedTestIds: string[] | null

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date
}
