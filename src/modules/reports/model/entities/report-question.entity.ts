import { TestTemplate } from 'src/modules/test/model/entities/test-template.entity'
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'

import { ReportSubject } from './report-subject.entity'

@Entity({ name: 'report_question' })
export class ReportQuestion {
  @PrimaryGeneratedColumn('increment')
  id: number

  @ManyToOne(() => TestTemplate, {
    onDelete: 'CASCADE',
  })
  question: TestTemplate

  @ManyToOne(
    () => ReportSubject,
    (reportSubject) => reportSubject.reportRaces,
    {
      onDelete: 'CASCADE',
    },
  )
  reportSubject: ReportSubject

  @Column({ length: 1 })
  option_correct: string

  @Column({
    type: 'int',
    default: 0,
  })
  total_a: number

  @Column({
    type: 'int',
    default: 0,
  })
  total_b: number

  @Column({
    type: 'int',
    default: 0,
  })
  total_c: number

  @Column({
    type: 'int',
    default: 0,
  })
  total_d: number

  @Column({
    type: 'int',
    default: 0,
  })
  total_null: number

  @Column({
    type: 'int',
    default: 0,
  })
  fluente: number

  @Column({
    type: 'int',
    default: 0,
  })
  nao_fluente: number

  @Column({
    type: 'int',
    default: 0,
  })
  frases: number

  @Column({
    type: 'int',
    default: 0,
  })
  palavras: number

  @Column({
    type: 'int',
    default: 0,
  })
  silabas: number

  @Column({
    type: 'int',
    default: 0,
  })
  nao_leitor: number

  @Column({
    type: 'int',
    default: 0,
  })
  nao_avaliado: number

  @Column({
    type: 'int',
    default: 0,
  })
  nao_informado: number
}
