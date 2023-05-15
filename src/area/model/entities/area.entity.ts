import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "area" })
export class Area {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  ARE_ID: number;

  @Column({
    type: String,
  })
  ARE_NOME: string;

  @Column({
    type: String,
    nullable: true,
  })
  ARE_DESCRICAO: string;

  @Column({
    default: () => "1",
  })
  ARE_ATIVO: boolean;

  @CreateDateColumn({ type: "timestamp" })
  ARE_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  ARE_DT_ATUALIZACAO: Date;
}
