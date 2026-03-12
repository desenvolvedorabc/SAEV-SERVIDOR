import { Student } from 'src/modules/student/model/entities/student.entity'
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

export enum ConversationWindowStatus {
  PENDING_OPT_IN = 'PENDING_OPT_IN',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  OPTED_OUT = 'OPTED_OUT',
}

@Entity({
  name: 'whatsapp_janelas_conversa',
})
@Index(['studentId', 'status'])
@Index(['studentId', 'status', 'phoneNumber'], {
  unique: false,
})
@Index(['expiresAt'])
export class WhatsAppConversationWindow {
  @PrimaryGeneratedColumn('increment', { type: 'mediumint' })
  id: number

  @Column({ type: 'int', nullable: false })
  studentId: number

  @Column({
    type: 'enum',
    enum: ConversationWindowStatus,
    default: ConversationWindowStatus.PENDING_OPT_IN,
  })
  status: ConversationWindowStatus

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
  })
  phoneNumber: string

  @Column({
    type: 'datetime',
    nullable: true,
  })
  expiresAt: Date | null

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  messageSid: string | null

  @ManyToOne(() => Student, (student) => student.whatsappConversationWindows, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'studentId',
  })
  student: Student

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  isActive(): boolean {
    if (this.status !== ConversationWindowStatus.ACTIVE) {
      return false
    }

    if (!this.expiresAt) {
      return false
    }

    return new Date() < this.expiresAt
  }

  getRemainingHours(): number {
    if (!this.expiresAt || this.status !== ConversationWindowStatus.ACTIVE) {
      return 0
    }

    const now = new Date()
    const remaining = this.expiresAt.getTime() - now.getTime()
    return Math.max(0, remaining / (1000 * 60 * 60))
  }
}
