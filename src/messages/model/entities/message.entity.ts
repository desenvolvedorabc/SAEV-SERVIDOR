import { County } from "src/counties/model/entities/county.entity";
import { School } from "src/school/model/entities/school.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "messages" })
export class Message {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  MEN_ID: number;

  @Column({
    type: String,
    comment: 'Campo destinado a informar o título da mensagem'
  })
  MEN_TITLE: string;

  @Column({
    type: "longtext",
    comment: 'Campo destinado a informar o corpo da mensagem'
  })
  MEN_TEXT: string;

  @Column({
    type: "tinyint",
    default: 0,
    nullable: false,
  })
  MEN_IS_DELETE: boolean;

  @CreateDateColumn({ type: "timestamp" })
  MEN_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  MEN_DT_ATUALIZACAO: Date;

  @ManyToMany(() => County, (county) => county.messages)
  @JoinTable()
  municipios: County[];

  @ManyToMany(() => School, (school) => school.ESC_MEN)
  @JoinTable()
  schools: School[];
}
