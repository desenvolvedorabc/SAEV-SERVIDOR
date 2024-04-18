import { SchoolClass } from "src/school-class/model/entities/school-class.entity";
import { Student } from "src/student/model/entities/student.entity";
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

@Entity({ name: "infrequencia" })
@Index(["IFR_MES", "IFR_ANO"], {
  unique: false
})
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
  @Index({
    unique: false
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
  @Index({
    unique: false
  })
  IFR_ALU: Student;

  @ManyToOne(() => SchoolClass,{
    nullable: true
  })
  @JoinColumn({ name: "IFR_SCHOOL_CLASS_ID" })
  @Index({
    unique: false
  })
  IFR_SCHOOL_CLASS: SchoolClass;

  @Column({ nullable: true, unique: true })
  IFR_OLD_ID: number;
}
