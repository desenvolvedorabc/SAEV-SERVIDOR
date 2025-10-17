import { County } from 'src/modules/counties/model/entities/county.entity'
import { TypeSchoolEnum } from 'src/modules/school/model/enum/type-school.enum'
import { State } from 'src/modules/states/model/entities/state.entity'
import { User } from 'src/modules/user/model/entities/user.entity'
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { TypeMicrodata } from '../dto/type-microdata.enum'
import { StatusMicrodata } from '../enum/status-microdata.enum'

@Entity({
  name: 'microdata',
})
export class Microdatum {
  @PrimaryGeneratedColumn('increment', { type: 'mediumint' })
  id: number

  @Column({
    type: 'enum',
    enum: TypeMicrodata,
  })
  type: TypeMicrodata

  @Column({
    type: 'enum',
    enum: TypeSchoolEnum,
    default: TypeSchoolEnum.MUNICIPAL,
  })
  typeSchool: TypeSchoolEnum

  @Column({
    type: 'enum',
    enum: StatusMicrodata,
    default: StatusMicrodata.IN_PROGRESS,
  })
  status: StatusMicrodata

  @Column({
    type: 'varchar',
  })
  file: string

  @Column({
    nullable: true,
  })
  stateId: number

  @ManyToOne(() => County, {
    nullable: true,
  })
  county: County

  @ManyToOne(() => State)
  @JoinColumn({ name: 'stateId' })
  state: State

  @ManyToOne(() => User)
  user: User

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
