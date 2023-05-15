import { County } from "src/counties/model/entities/county.entity";
import { User } from "src/user/model/entities/user.entity";
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Column,
  Entity,
} from "typeorm";

@Entity({
  name: "system_logs",
})
export class SystemLogs {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    comment: 'Campo destinado a informar o método: POST, DELETE, PUT'
  })
  method: string;

  @Column({
    comment: 'Campo destinado a informar o nome da entidade que está sendo gerado o log'
  })
  nameEntity: string;

  @Column({
    type: "longtext",
    nullable: true,
    comment: 'Campo destinado a informar o estado inicial do dado que será gerado o log'
  })
  stateInitial: string;

  @Column({
    type: "longtext",
    comment: 'Campo destinado a informar o estado final do dado que será gerado o log'
  })
  stateFinal: string;

  @ManyToOne(() => User)
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
