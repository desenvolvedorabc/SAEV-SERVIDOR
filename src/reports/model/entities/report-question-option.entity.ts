import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ReportSubject } from "./report-subject.entity";
import { ReportQuestion } from "./report-question.entity";

@Entity({ name: "report_question_option" })
export class ReportQuestionOption {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column()
  option: string;

  @Column({
    type: "int",
    default: 0,
  })
  totalCorrect: number;

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

  @ManyToOne(
    () => ReportQuestion,
    (reportQuestion) => reportQuestion.reportOptions,
    {
      onDelete: "CASCADE",
    },
  )
  reportQuestion: ReportQuestion;

  @CreateDateColumn()
  createdAt: Date;
}
