import { County } from 'src/modules/counties/model/entities/county.entity'
import { Regional } from 'src/modules/regional/model/entities/regional.entity'
import { User } from 'src/modules/user/model/entities/user.entity'
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity({ name: 'estados' })
export class State {
  @PrimaryGeneratedColumn('increment', { type: 'mediumint' })
  id: number

  @Column({
    type: 'varchar',
    nullable: false,
    unique: true,
  })
  name: string

  @Column({ type: 'varchar', nullable: false, length: 2, unique: true })
  abbreviation: string

  @Column({ default: true })
  active: boolean

  @OneToMany(() => County, (county) => county.state)
  counties: County[]

  @OneToMany(() => Regional, (regional) => regional.state)
  regionals: Regional[]

  @OneToMany(() => User, (user) => user.state)
  users: User[]

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date
}
