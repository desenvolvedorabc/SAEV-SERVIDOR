import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "raca" })
export class Skin {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  PEL_ID: number;

  @Column({
    type: String,
  })
  PEL_NOME: string;

  @Column({
    default: () => "1",
  })
  PEL_ATIVO: boolean;

  @CreateDateColumn({ type: "timestamp" })
  PEL_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  PEL_DT_ATUALIZACAO: Date;

  @Column({ nullable: true, unique: true })
  PEL_OLD_ID: number;
}
