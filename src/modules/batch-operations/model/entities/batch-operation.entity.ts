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

import { TypeSchoolEnum } from '../../../school/model/enum/type-school.enum'
import { User } from '../../../user/model/entities/user.entity'
import { BatchOperationStatus } from '../enums/batch-operation-status.enum'
import { BatchOperationType } from '../enums/batch-operation-type.enum'

export interface BatchOperationCombination {
  countyId: number
  network: TypeSchoolEnum
}

@Entity({ name: 'batch_operation' })
@Index(['type', 'status'])
export class BatchOperation {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column('enum', { enum: BatchOperationType })
  type: BatchOperationType

  @Column('enum', {
    enum: BatchOperationStatus,
    default: BatchOperationStatus.PENDING,
  })
  status: BatchOperationStatus

  @Column('json')
  combinations: BatchOperationCombination[]

  @Column({ type: 'varchar', nullable: true })
  year: string | null

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'requested_by_user_id' })
  requestedByUser: User | null

  @Column({ name: 'requested_by_user_id', type: 'mediumint', nullable: true })
  requestedByUserId: number | null

  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage: string | null

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number

  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  startDate: Date | null

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate: Date | null

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date
}
