import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ReportEdition } from "./report-edition.entity";
import { SubjectTypeEnum } from "src/subject/model/enum/subject.enum";
import { Test } from "src/test/model/entities/test.entity";

@Entity({ name: "report_not_evaluated" })
export class ReportNotEvaluated {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column()
  name: string;

  @Column({
    type: "enum",
    enum: SubjectTypeEnum,
  })
  type: SubjectTypeEnum;

  @ManyToOne(() => Test, (test) => test.report_tests)
  @JoinColumn()
  test: Test;

  @Column({
    type: "int",
    default: 0,
  })
  countTotalStudents: number;

  @Column('simple-array', { nullable: true })
  idStudents: string[];

  @Column({
    type: "int",
    default: 0,
  })
  countStudentsLaunched: number;

  @Column({
    type: "int",
    default: 0,
  })
  countPresentStudents: number;

  @Column({
    type: "int",
    default: 0,
  })
  // recusou-se a participar
  recusa: number;

  @Column({
    type: "int",
    default: 0,
  })
  // faltou mas está frequentando a escola
  ausencia: number;

  @Column({
    type: "int",
    default: 0,
  })
  // abandonou a escola
  abandono: number;

  @Column({
    type: "int",
    default: 0,
  })
  // foi transferido para outra escola
  transferencia: number;

  @Column({
    type: "int",
    default: 0,
  })
  // motivos de deficiência
  deficiencia: number;

  @Column({
    type: "int",
    default: 0,
  })
  nao_participou: number;

  @ManyToOne(() => ReportEdition, (edition) => edition.reportsSubjects, {
    onDelete: "CASCADE",
  })
  reportEdition: ReportEdition;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
