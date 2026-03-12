import { Student } from 'src/modules/student/model/entities/student.entity'
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'

import { TutorMessage } from './tutor-message.entity'

export enum SendTutorMessageStatus {
  PENDENTE = 'PENDENTE',
  PENDENTE_JANELA = 'PENDENTE_JANELA',
  NAO_ENVIADO = 'NAO_ENVIADO',
  ENTREGUE = 'ENTREGUE',
  ENVIADO = 'ENVIADO',
  FALHOU = 'FALHOU',
  USUARIO_RECUSOU = 'USUARIO_RECUSOU',
}

@Entity({
  name: 'envios_tutor_mensagens',
})
@Index(['studentId', 'statusWhatsapp'], {
  unique: false,
})
export class SendTutorMessage {
  @PrimaryGeneratedColumn('increment', { type: 'mediumint' })
  id: number

  @Column({
    type: 'enum',
    enum: SendTutorMessageStatus,
    default: SendTutorMessageStatus.PENDENTE,
  })
  statusEmail: SendTutorMessageStatus

  @Column({
    type: 'enum',
    enum: SendTutorMessageStatus,
    default: SendTutorMessageStatus.PENDENTE,
  })
  statusWhatsapp: SendTutorMessageStatus

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
