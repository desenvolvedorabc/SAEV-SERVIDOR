import { School } from 'src/modules/school/model/entities/school.entity'
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { CreateTutorMessageFiltersDto } from '../dto/create-tutor-message.dto'
import { SendTutorMessage } from './send-tutor-message.entity'

@Entity({
  name: 'tutor_mensagens',
})
export class TutorMessage {
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

  @Column({ type: 'json' })
  filters: CreateTutorMessageFiltersDto

  @OneToMany(
    () => SendTutorMessage,
    (sendTutorMessage) => sendTutorMessage.tutorMessage,
  )
  sendTutorMessages: SendTutorMessage[]

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
