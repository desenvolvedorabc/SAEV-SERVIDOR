import { Test } from "src/test/model/entities/test.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { AssessmentOnlinePage } from "./assessment-online-page.entity";

@Entity({
  name: "avaliacao_online",
})
export class AssessmentOnline {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  id: number;

  @Column({ default: true })
  active: boolean;

  @OneToOne(() => Test, (test) => test.assessmentOnline)
  test: Test;

  @OneToMany(() => AssessmentOnlinePage, (page) => page.assessmentOnline, {
    cascade: true,
  })
  pages: AssessmentOnlinePage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
