import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity({ name: 'termos_documento' })
export class TermsDocument {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({ type: 'varchar', length: 50 })
  version: string

  @Column({ type: 'text' })
  url: string

  @Column({ default: true })
  active: boolean

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date
}
