import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { v4 as uuid } from "uuid";

@Entity({ name: "pcd" })
export class Pcd {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  PCD_ID: number;

  @Column({
    type: String,
  })
  PCD_NOME: string;

  @Column({
    default: () => "1",
  })
  PCD_ATIVO: boolean;

  @Column({ nullable: true, unique: true })
  PCD_OLD_ID: number;

  @CreateDateColumn({ type: "timestamp" })
  PCD_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  PCD_DT_ATUALIZACAO: Date;
}
