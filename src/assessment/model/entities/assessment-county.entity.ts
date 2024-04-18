import { County } from "src/counties/model/entities/county.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Assessment } from "./assessment.entity";

@Entity({ name: "avaliacao_municipio" })
@Index(["AVM_MUN"], { unique: false })
export class AssessmentCounty {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  AVM_ID: number;

  @Column({
    default: () => "1",
  })
  AVM_ATIVO: boolean;

  @CreateDateColumn({ type: "timestamp" })
  AVM_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  AVM_DT_ATUALIZACAO: Date;

  @Column({ type: "timestamp", nullable: false })
  AVM_DT_INICIO: Date;

  @Column({ type: "timestamp", nullable: false })
  AVM_DT_FIM: Date;

  @Column({ type: "timestamp", nullable: false })
  AVM_DT_DISPONIVEL: Date;

  @ManyToOne(() => County, (municipio) => municipio.assessmentCounty, {
    eager: true,
  })
  @JoinColumn({ name: "AVM_MUN_ID" })
  AVM_MUN: County;

  @ManyToOne(() => Assessment, (assessment) => assessment.AVA_AVM)
  @JoinColumn({ name: "AVM_AVA_ID" })
  AVM_AVA: Assessment;

  @Column({ nullable: true, unique: true, comment: 'Campo para informar o ID antigo' })
  AVM_OLD_ID: number;
}
