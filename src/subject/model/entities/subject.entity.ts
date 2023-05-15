import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { SubjectTypeEnum } from "../enum/subject-type.enum";

@Entity({ name: "disciplina" })
export class Subject {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  DIS_ID: number;

  @Column({
    type: String,
  })
  DIS_NOME: string;

  @Column({
    type: String,
  })
  DIS_COLOR: string;

  @Column({
    default: () => "1",
  })
  DIS_ATIVO: boolean;

  @Column({
    type: "enum",
    enum: SubjectTypeEnum,
    default: SubjectTypeEnum.OBJETIVA,
  })
  DIS_TIPO: SubjectTypeEnum;

  @CreateDateColumn({ type: "timestamp" })
  DIS_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  DIS_DT_ATUALIZACAO: Date;

  @Column({ nullable: true, unique: true })
  DIS_OLD_ID: number;
}
