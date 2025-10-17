import { County } from 'src/modules/counties/model/entities/county.entity'
import { ReportEdition } from 'src/modules/reports/model/entities/report-edition.entity'
import { School } from 'src/modules/school/model/entities/school.entity'
import { State } from 'src/modules/states/model/entities/state.entity'
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { TypeRegionalEnum } from '../enum/type-regional.enum'

@Entity({ name: 'regionais' })
@Index(['type'], { unique: false })
@Index(['stateId'], { unique: false })
@Index(['countyId'], { unique: false })
export class Regional {
  @PrimaryGeneratedColumn('increment', { type: 'mediumint' })
  id: number

  @Column({ type: 'varchar', nullable: false })
  name: string

  @Column({ type: 'boolean', default: true })
  active: boolean

  @Column({ type: 'enum', enum: TypeRegionalEnum, nullable: false })
  type: TypeRegionalEnum

  @ManyToOne(() => State, (state) => state.regionals)
  @JoinColumn({ name: 'stateId' })
  state: State

  @Column({ nullable: true })
  stateId: number

  @ManyToOne(() => County, (county) => county.regionals)
  @JoinColumn({ name: 'countyId' })
  county: County

  @Column({ nullable: true })
  countyId: number

  @OneToMany(() => County, (county) => county.stateRegional)
  counties: County[]

  @OneToMany(() => School, (school) => school.regional)
  schools: School[]

  @OneToMany(() => ReportEdition, (reportEdition) => reportEdition.regional)
  reportEditions: ReportEdition[]

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date
}
