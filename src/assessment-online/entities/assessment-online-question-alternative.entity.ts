import { Test } from "src/test/model/entities/test.entity";
import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { AssessmentOnlineQuestion } from "./assessment-online-question.entity";

@Entity({
  name: 'avaliacao_online_question_alternative'
})
export class AssessmentOnlineQuestionAlternative {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  id: number;

  @Column({
    nullable: false,
    type: 'varchar'
  })
  option: string;

  @Column({
    nullable: true,
    type: 'longtext'
  })
  description: string;

  @Column({
    nullable: true,
    type: 'varchar'
  })
  image: string;

  @ManyToOne(() => AssessmentOnlineQuestion, question => question.alternatives, {
    onDelete: 'CASCADE'
  })
  question: AssessmentOnlineQuestion;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
