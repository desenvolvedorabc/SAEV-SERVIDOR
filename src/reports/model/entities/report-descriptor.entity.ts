import { HeadquarterTopicItem } from "src/headquarters/model/entities/headquarter-topic-item.entity";
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

@Entity({ name: "report_descriptor" })
export class ReportDescriptor {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @ManyToOne(() => HeadquarterTopicItem)
  @JoinColumn()
  descriptor: HeadquarterTopicItem;

  @ManyToOne(() => ReportEdition, (edition) => edition.reportsSubjects, {
    onDelete: "CASCADE",
  })
  report_edition: ReportEdition;

  @ManyToOne(() => Test)
  @JoinColumn()
  test: Test;

  @Column({
    type: "int",
    default: 0,
    comment: 'Campo destinado a informar quantidade de alunos'
  })
  total: number;

  @Column({
    type: "int",
    default: 0,
    comment: 'Campo destinado a informar a quantidade de alunos que acertaram'
  })
  totalCorrect: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
