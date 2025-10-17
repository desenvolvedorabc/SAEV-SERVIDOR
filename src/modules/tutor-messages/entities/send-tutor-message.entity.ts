import { Student } from 'src/modules/student/model/entities/student.entity'
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'

import { TutorMessage } from './tutor-message.entity'

export enum StatusSendTutorMessage {
  PENDENTE = 'PENDENTE',
  NAO_ENVIADO = 'NAO_ENVIADO',
  ENTREGUE = 'ENTREGUE',
  ENVIADO = 'ENVIADO',
  FALHOU = 'FALHOU',
}

@Entity({
  name: 'envios_tutor_mensagens',
})
export class SendTutorMessage {
  @PrimaryGeneratedColumn('increment', { type: 'mediumint' })
  id: number

  @Column({
    type: 'enum',
    enum: StatusSendTutorMessage,
    default: StatusSendTutorMessage.PENDENTE,
  })
  statusEmail: StatusSendTutorMessage

  @Column({
    type: 'enum',
    enum: StatusSendTutorMessage,
    default: StatusSendTutorMessage.PENDENTE,
  })
  statusWhatsapp: StatusSendTutorMessage

  @Column({ type: 'int', nullable: false })
  studentId: number

  @Column({ type: 'int', nullable: false })
  tutorMessageId: number

  @ManyToOne(() => Student, (student) => student.sendTutorMessages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'studentId',
  })
  student: Student

  @ManyToOne(
    () => TutorMessage,
    (tutorMessage) => tutorMessage.sendTutorMessages,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({
    name: 'tutorMessageId',
  })
  tutorMessage: TutorMessage

  @CreateDateColumn()
  createdAt: Date
}
