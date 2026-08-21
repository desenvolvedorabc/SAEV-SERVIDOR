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

import { Responsible } from './responsible.entity'

@Entity({ name: 'dispositivos_responsavel' })
@Index(['responsibleId', 'active'])
export class ResponsibleDevice {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({ type: 'int', nullable: false })
  responsibleId: number

  @ManyToOne(() => Responsible, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'responsibleId' })
  responsible: Responsible

  @Column({ type: 'varchar', length: 255, unique: true })
  pushToken: string

  @Column({ default: () => '1' })
  active: boolean

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date
}
