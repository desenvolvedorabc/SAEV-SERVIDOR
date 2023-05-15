import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "ano_letivo" })
export class SchoolYear {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  ANO_ID: number;

  @Column({
    type: String,
  })
  ANO_NOME: string;

  @Column({
    default: () => "1",
  })
  ANO_ATIVO: boolean;

  @CreateDateColumn({ type: "timestamp" })
  ANO_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  ANO_DT_ATUALIZACAO: Date;

  @Column({ nullable: true, unique: true })
  ANO_OLD_ID: number;
}
