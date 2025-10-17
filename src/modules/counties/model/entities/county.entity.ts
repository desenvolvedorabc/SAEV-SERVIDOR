import { AssessmentCounty } from 'src/modules/assessment/model/entities/assessment-county.entity'
import { Message } from 'src/modules/messages/model/entities/message.entity'
import { Regional } from 'src/modules/regional/model/entities/regional.entity'
import { ReportEdition } from 'src/modules/reports/model/entities/report-edition.entity'
import { School } from 'src/modules/school/model/entities/school.entity'
import { State } from 'src/modules/states/model/entities/state.entity'
import { Teacher } from 'src/modules/teacher/model/entities/teacher.entity'
import { User } from 'src/modules/user/model/entities/user.entity'
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity({ name: 'municipio' })
@Index(['MUN_COD_IBGE'], { unique: false })
@Index(['stateId'], { unique: false })
@Index(['stateRegionalId'], { unique: false })
@Index(['MUN_PARCEIRO_EPV'], { unique: false })
@Index(['MUN_COMPARTILHAR_DADOS'], { unique: false })
export class County {
  @PrimaryGeneratedColumn('increment', { type: 'mediumint' })
  MUN_ID: number

  @Column({
    type: String,
  })
  MUN_UF: string

  @Column({
    type: String,
  })
  MUN_NOME: string

  @Column({
    type: String,
  })
  MUN_CIDADE: string

  @Column({
    type: String,
  })
  MUN_ENDERECO: string

  @Column({
    type: String,
  })
  MUN_NUMERO: string

  @Column({
    type: String,
  })
  MUN_COMPLEMENTO: string

  @Column({
    type: String,
  })
  MUN_BAIRRO: string

  @Column({
    type: String,
  })
  MUN_CEP: string

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  MUN_DT_INICIO: Date

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  MUN_DT_FIM: Date

  @Column({
    type: String,
    comment: 'Campo destinado a informar o arquivo de convênio',
  })
  MUN_ARQ_CONVENIO: string

  @Column({
    type: String,
    comment: 'Campo destinado a informar o arquivo de upload da logo',
  })
  MUN_LOGO: string

  @Column({
    default: () => '1',
  })
  MUN_ATIVO: boolean

  @Column({
    type: 'boolean',
    default: false,
  })
  MUN_PARCEIRO_EPV: boolean

  @Column({
    type: 'boolean',
    default: false,
  })
  MUN_COMPARTILHAR_DADOS: boolean

  @Column({
    type: 'boolean',
    default: false,
  })
  MUN_MENSAGEM_WHATSAPP_ATIVO: boolean

  @Column({
    type: 'boolean',
    default: false,
  })
  MUN_MENSAGEM_EMAIL_ATIVO: boolean

  @Column()
  MUN_STATUS: string

  @CreateDateColumn({ type: 'timestamp' })
  MUN_DT_CRIACAO: Date

  @UpdateDateColumn({ type: 'timestamp' })
  MUN_DT_ATUALIZACAO: Date

  @OneToMany(() => School, (school) => school.ESC_MUN)
  schools: School[]

  @OneToMany(() => User, (user) => user.USU_MUN)
  users: User[]

  @OneToMany(() => Teacher, (teacher) => teacher.PRO_MUN)
  teachers: Teacher[]

  @OneToMany(() => Regional, (regional) => regional.county)
  regionals: Regional[]

  @OneToMany(
    () => AssessmentCounty,
    (assessmentCounty) => assessmentCounty.AVM_MUN,
  )
  assessmentCounty: AssessmentCounty[]

  @ManyToMany(() => Message, (message) => message.municipios)
  messages: Message[]

  @ManyToOne(() => State, (state) => state.counties)
  @JoinColumn({ name: 'stateId' })
  state: State

  @Column({ nullable: true })
  stateId: number

  @ManyToOne(() => Regional, (stateRegional) => stateRegional.counties)
  @JoinColumn({ name: 'stateRegionalId' })
  stateRegional: Regional

  @Column({ nullable: true })
  stateRegionalId: number

  @OneToMany(() => ReportEdition, (edition) => edition.county)
  @JoinColumn()
  report_editions: ReportEdition[]

  @Column({ nullable: true })
  MUN_COD_IBGE: number

  @Column({
    nullable: true,
    unique: true,
    comment: 'Campo para informar o ID antigo',
  })
  MUN_OLD_ID: number
}
