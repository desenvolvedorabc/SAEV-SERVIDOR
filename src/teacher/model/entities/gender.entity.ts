import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Teacher } from "./teacher.entity";

@Entity({ name: "genero" })
export class Gender {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  GEN_ID: number;

  @Column({
    type: String,
  })
  GEN_NOME: string;

  @Column({
    default: () => "1",
  })
  GEN_ATIVO: boolean;

  @CreateDateColumn({ type: "timestamp" })
  GEN_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  GEN_DT_ATUALIZACAO: Date;

  @OneToMany(() => Teacher, (teacher) => teacher.PRO_GEN)
  GEN_PRO: Teacher[];
}
