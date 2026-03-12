import { Test } from 'src/modules/test/model/entities/test.entity'
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { EditionTypeEnum } from '../enum/edition-type.enum'
import { AssessmentCounty } from './assessment-county.entity'

@Entity({ name: 'avaliacao' })
export class Assessment {
  @PrimaryGeneratedColumn('increment', { type: 'mediumint' })
  AVA_ID: number

  @Column({
    type: String,
  })
  AVA_NOME: string

  @Column({
    type: String,
  })
  AVA_ANO: string

  @CreateDateColumn({ type: 'timestamp' })
  AVA_DT_CRIACAO: Date

  @UpdateDateColumn({ type: 'timestamp' })
  AVA_DT_ATUALIZACAO: Date

  @Column({
    default: () => '1',
  })
  AVA_ATIVO: boolean

  @Column({ type: 'timestamp', nullable: true })
  AVA_DT_INICIO: Date

  @Column({ type: 'timestamp', nullable: true })
  AVA_DT_FIM: Date

  @Column({
    type: 'enum',
    enum: EditionTypeEnum,
    default: EditionTypeEnum.ESPECIFICO,
  })
  AVA_TIPO: EditionTypeEnum

  @ManyToMany(() => Test, (tests) => tests.TES_ASSESMENTS)
  @JoinTable({
    name: 'avaliacao_teste',
    joinColumn: {
      name: 'AVA_ID',
    },
    inverseJoinColumn: {
      name: 'TES_ID',
    },
  })
  AVA_TES: Test[]

  @OneToMany(() => AssessmentCounty, (assessments) => assessments.AVM_AVA)
  AVA_AVM: AssessmentCounty[]

  @Column({
    nullable: true,
    unique: true,
    comment: 'Campo para informar o ID antigo',
  })
  AVA_OLD_ID: number
}
