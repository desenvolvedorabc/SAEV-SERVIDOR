import { Student } from 'src/modules/student/model/entities/student.entity'
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { ResponsibleNotification } from './responsible-notification.entity'

@Entity({ name: 'responsaveis' })
export class Responsible {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({ type: String, nullable: true })
  name: string

  @Column({ type: String, length: 191, unique: true })
  email: string

  @Column({ type: 'text', nullable: true })
  avatar: string

  @Column({ type: String, nullable: true, select: false })
  password: string

  @Column({ default: () => '1' })
  active: boolean

  @Column({ type: 'timestamp', nullable: true, default: null })
  termsAcceptedAt: Date | null

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date

  @OneToMany(() => Student, (student) => student.ALU_RES)
  students: Student[]

  @OneToMany(
    () => ResponsibleNotification,
    (notification) => notification.responsible,
  )
  notifications: ResponsibleNotification[]
}
