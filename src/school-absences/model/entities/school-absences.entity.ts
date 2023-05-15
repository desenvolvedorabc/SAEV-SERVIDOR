import { Student } from "src/student/model/entities/student.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "infrequencia" })
export class SchoolAbsence {
  @PrimaryGeneratedColumn("increment")
  IFR_ID: number;

  @Column({
    type: Number,
  })
  IFR_MES: number;

  @Column({
    type: Number,
  })
  IFR_ANO: number;

  @Column({
    type: Number,
    comment: 'Campo destinado a informar a quantidade de faltas'
  })
  IFR_FALTA: number;

  @CreateDateColumn({ type: "timestamp" })
  IFR_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  IFR_DT_ATUALIZACAO: Date;

  @ManyToOne(() => Student)
  @JoinColumn({ name: "IFR_ALU_ID" })
  IFR_ALU: Student;

  @Column({ nullable: true, unique: true })
  IFR_OLD_ID: number;
}
