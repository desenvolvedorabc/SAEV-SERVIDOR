import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { AssessmentOnlineQuestion } from "./assessment-online-question.entity";
import { AssessmentOnline } from "./assessment-online.entity";

@Entity({
  name: "avaliacao_online_page",
})
export class AssessmentOnlinePage {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  id: number;

  @Column({
    nullable: false,
    type: "varchar",
  })
  title: string;

  @Column({
    nullable: true,
    type: "varchar",
  })
  image: string;

  @Column({ nullable: true, type: "int" })
  order: number;

  @ManyToOne(
    () => AssessmentOnline,
    (assessmentOnline) => assessmentOnline.pages,
    {
      onDelete: "CASCADE",
    },
  )
  assessmentOnline: AssessmentOnline;

  @OneToMany(
    () => AssessmentOnlineQuestion,
    (question) => question.page,
    { cascade: true },
  )
  questions: AssessmentOnlineQuestion[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
