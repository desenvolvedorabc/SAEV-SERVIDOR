import { User } from "src/user/model/entities/user.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { StatusImportData } from "../enum/status-data-enum";

@Entity({ name: "importar_dados" })
export class ImportData {
  @PrimaryGeneratedColumn("increment")
  DAT_ID: number;

  @Column({
    type: String,
  })
  DAT_NOME: string;

  @CreateDateColumn({ type: "timestamp" })
  DAT_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  DAT_DT_ATUALIZACAO: Date;

  @Column({
    type: 'enum',
    enum: StatusImportData,
    default: StatusImportData.IN_PROGRESS
  })
  DAT_STATUS: StatusImportData;

  @Column({
    type: String,
    nullable: true,
  })
  DAT_ARQUIVO_URL: string;

  @Column({
    type: String,
    nullable: true,
  })
  DAT_ARQUIVO_ERROR_URL: string;

  @Column({
    type: String,
    nullable: true,
  })
  DAT_OBS: string;

  @ManyToOne(() => User)
  DAT_USU: User;
}
