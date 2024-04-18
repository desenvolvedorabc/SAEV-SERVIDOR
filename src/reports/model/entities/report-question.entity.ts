import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ReportSubject } from "./report-subject.entity";
import { TestTemplate } from "src/test/model/entities/test-template.entity";
import { ReportQuestionOption } from "./report-question-option.entity";

@Entity({ name: "report_question" })
export class ReportQuestion {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @ManyToOne(() => TestTemplate, {
    onDelete: "CASCADE",
  })
  question: TestTemplate;

  @ManyToOne(
    () => ReportSubject,
    (reportSubject) => reportSubject.reportRaces,
    {
      onDelete: "CASCADE",
    },
  )
  reportSubject: ReportSubject;

  @OneToMany(
    () => ReportQuestionOption,
    (reportQuestionOption) => reportQuestionOption.reportQuestion,
  )
  @JoinColumn()
  reportOptions: ReportQuestionOption[];

  @CreateDateColumn()
  createdAt: Date;
}
