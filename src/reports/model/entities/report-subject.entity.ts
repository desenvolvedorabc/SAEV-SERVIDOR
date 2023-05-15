import { SubjectTypeEnum } from "src/subject/model/enum/subject.enum";
import { Test } from "src/test/model/entities/test.entity";
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

@Entity({ name: "report_subject" })
export class ReportSubject {
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
  totalGradesStudents: number;

  @Column({
    type: "int",
    default: 0,
  })
  fluente: number;

  @Column({
    type: "int",
    default: 0,
  })
  nao_fluente: number;

  @Column({
    type: "int",
    default: 0,
  })
  frases: number;

  @Column({
    type: "int",
    default: 0,
  })
  palavras: number;

  @Column({
    type: "int",
    default: 0,
  })
  silabas: number;

  @Column({
    type: "int",
    default: 0,
  })
  nao_leitor: number;

  @Column({
    type: "int",
    default: 0,
  })
  nao_avaliado: number;

  @Column({
    type: "int",
    default: 0,
  })
  nao_informado: number;

  @ManyToOne(() => ReportEdition, (edition) => edition.reportsSubjects, {
    onDelete: "CASCADE",
  })
  reportEdition: ReportEdition;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
