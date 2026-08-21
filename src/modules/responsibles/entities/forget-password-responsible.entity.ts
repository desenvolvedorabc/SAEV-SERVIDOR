import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { Responsible } from './responsible.entity'

@Entity({ name: 'forget_password_responsible' })
export class ForgetPasswordResponsible {
  @PrimaryGeneratedColumn('increment', { type: 'mediumint' })
  id: number

  @Column()
  responsibleId: number

  @OneToOne(() => Responsible)
  @JoinColumn({ name: 'responsibleId' })
  responsible: Responsible

  @Column()
  token: string

  @Column({ nullable: false, type: 'boolean' })
  isValid: boolean

  @Column({ type: 'timestamp' })
  expiresAt: Date

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date
}
