import { Test } from "src/test/model/entities/test.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { AssessmentCounty } from "./assessment-county.entity";

@Entity({ name: "avaliacao" })
export class Assessment {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  AVA_ID: number;

  @Column({
    type: String,
  })
  AVA_NOME: string;

  @Column({
    type: String,
  })
  AVA_ANO: string;

  @CreateDateColumn({ type: "timestamp" })
  AVA_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  AVA_DT_ATUALIZACAO: Date;

  @Column({
    default: () => "1",
  })
  AVA_ATIVO: boolean;

  @ManyToMany(() => Test, (tests) => tests.TES_ASSESMENTS)
  @JoinTable({
    name: "avaliacao_teste",
    joinColumn: {
      name: "AVA_ID",
    },
    inverseJoinColumn: {
      name: "TES_ID",
    },
    
  })
  AVA_TES: Test[];

  @OneToMany(() => AssessmentCounty, (assessments) => assessments.AVM_AVA)
  AVA_AVM: AssessmentCounty[];

  @Column({ nullable: true, unique: true, comment: 'Campo para informar o ID antigo' })
  AVA_OLD_ID: number;
}
