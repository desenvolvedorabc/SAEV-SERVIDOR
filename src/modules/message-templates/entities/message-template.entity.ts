import { School } from 'src/modules/school/model/entities/school.entity'
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity({
  name: 'templates_mensagens',
})
export class MessageTemplate {
  @PrimaryGeneratedColumn('increment', { type: 'mediumint' })
  id: number

  @Column({ type: 'varchar', nullable: false })
  title: string

  @Column({
    type: 'longtext',
    nullable: false,
  })
  content: string

  @Column({ type: 'int', nullable: true })
  schoolId: number

  @ManyToOne(() => School, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'schoolId',
  })
  school: School

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
