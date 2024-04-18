import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "arquivo" })
export class FileEntity {
  @PrimaryGeneratedColumn("increment")
  ARQ_ID: number;

  @Column({
    type: String,
  })
  ARQ_NOME: string;

  @Column({
    type: String,
    nullable: true,
  })
  ARQ_URL: string;

  @Column({
    default: () => "1",
  })
  ARQ_ATIVO: boolean;

  @CreateDateColumn({ type: "timestamp" })
  ARQ_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  ARQ_DT_ATUALIZACAO: Date;
}
