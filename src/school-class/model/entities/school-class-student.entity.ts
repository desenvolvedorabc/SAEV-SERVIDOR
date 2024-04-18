import { Student } from "../../../student/model/entities/student.entity";
import { SchoolClass } from "./school-class.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "turma_aluno" })
@Index(["startDate", "endDate"])
@Index(["schoolClass"], {
  unique: false
})
@Index(['student'], {
  unique: false
})
@Index(["schoolClass", "student"], {
  unique: false
})
export class SchoolClassStudent {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @ManyToOne(() => Student)
  student: Student;

  @ManyToOne(() => SchoolClass)
  schoolClass: SchoolClass;

  @Column("date", {comment: 'Campo destinado a quando o aluno entrou na turma'})
  startDate: Date;

  @Column("date", { nullable: true, comment: 'Campo destinado a quando o aluno saiu da turma' })
  endDate: Date;

  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt: Date;
}
