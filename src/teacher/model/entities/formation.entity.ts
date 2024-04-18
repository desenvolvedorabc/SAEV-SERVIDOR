import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Teacher } from "./teacher.entity";

@Entity({ name: "formacao" })
export class Formation {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  FOR_ID: number;

  @Column({
    type: String,
  })
  FOR_NOME: string;

  @Column({
    default: () => "1",
  })
  FOR_ATIVO: boolean;

  @CreateDateColumn({ type: "timestamp" })
  FOR_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  FOR_DT_ATUALIZACAO: Date;

  @OneToMany(() => Teacher, (teacher) => teacher.PRO_FOR)
  FOR_PRO: Teacher[];
}
