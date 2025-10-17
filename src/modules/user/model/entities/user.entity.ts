import { County } from 'src/modules/counties/model/entities/county.entity'
import { Notification } from 'src/modules/notifications/model/entities/notification.entity'
import { SubProfile } from 'src/modules/profile/model/entities/sub-profile.entity'
import { School } from 'src/modules/school/model/entities/school.entity'
import { State } from 'src/modules/states/model/entities/state.entity'
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity({ name: 'usuario' })
@Index(['USU_MUN'], { unique: false })
@Index(['USU_DOCUMENTO'], { unique: false })
export class User {
  @PrimaryGeneratedColumn('increment', { type: 'mediumint' })
  USU_ID: number

  @Column({
    type: String,
  })
  USU_NOME: string

  @Column({
    type: String,
  })
  USU_FONE: string

  @Column({
    unique: true,
    type: String,
    length: 191,
  })
  USU_EMAIL: string

  @Column({ select: false })
  USU_SENHA: string

  @Column({
    default: () => '1',
  })
  USU_ATIVO: boolean

  @CreateDateColumn({ type: 'timestamp' })
  USU_DT_CRIACAO: Date

  @UpdateDateColumn({ type: 'timestamp' })
  USU_DT_ATUALIZACAO: Date

  @Column({
    type: String,
    comment: 'Campo destinado a informar o upload do avatar',
  })
  USU_AVATAR: string

  @Column({
    type: String,
  })
  USU_DOCUMENTO: string

  @Column({ nullable: true })
  stateId: number

  @ManyToOne(() => County)
  @JoinColumn({ name: 'USU_MUN_ID' })
  USU_MUN: County

  @ManyToOne(() => School)
  @JoinColumn({ name: 'USU_ESC_ID' })
  USU_ESC: School

  @ManyToOne(() => State, (state) => state.users)
  @JoinColumn({ name: 'stateId' })
  state: State

  @BeforeInsert()
  @BeforeUpdate()
  emailToLowerCase() {
    this.USU_EMAIL = this.USU_EMAIL.toLowerCase()
  }

  @Column()
  isChangePasswordWelcome: boolean

  @ManyToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[]

  @ManyToOne(() => SubProfile)
  @JoinColumn({ name: 'USU_SPE_ID' })
  USU_SPE: SubProfile
}
