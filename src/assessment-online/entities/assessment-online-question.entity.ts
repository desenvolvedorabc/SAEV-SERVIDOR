import { Test } from "src/test/model/entities/test.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { AssessmentOnlineQuestionAlternative } from "./assessment-online-question-alternative.entity";
import { TestTemplate } from "src/test/model/entities/test-template.entity";
import { AssessmentOnlinePage } from "./assessment-online-page.entity";

@Entity({
  name: "avaliacao_online_question",
})
export class AssessmentOnlineQuestion {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  id: number;

  @Column({
    nullable: false,
    type: "longtext",
  })
  description: string;

  @Column({ nullable: true, type: "int" })
  order: number;

  @ManyToOne(
    () => AssessmentOnlinePage,
    (page) => page.questions,
    {
      onDelete: "CASCADE",
    },
  )
  page: AssessmentOnlinePage;

  @OneToOne(() => TestTemplate, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({
    name: 'questionTemplateId'
  })
  questionTemplate: TestTemplate

  @Column()
  questionTemplateId: number

  @OneToMany(
    () => AssessmentOnlineQuestionAlternative,
    (alternative) => alternative.question,
    { cascade: true },
  )
  alternatives: AssessmentOnlineQuestionAlternative[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
