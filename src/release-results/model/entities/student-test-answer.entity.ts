import { HeadquarterTopicItem } from "src/headquarters/model/entities/headquarter-topic-item.entity";
import { TestTemplate } from "src/test/model/entities/test-template.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { StudentTest } from "./student-test.entity";

@Entity({ name: "aluno_teste_resposta" })
export class StudentTestAnswer {
  @PrimaryGeneratedColumn("increment")
  ATR_ID: number;

  @Column({
    type: String,
  })
  ATR_RESPOSTA: string;

  @Column({
    type: Boolean,
    comment: 'Campo destinado a informar se o aluno acertou ou errou a questão.'
  })
  ATR_CERTO: boolean;

  @ManyToOne(() => TestTemplate)
  questionTemplate: TestTemplate;
  
  @ManyToOne(() => HeadquarterTopicItem)
  @JoinColumn({ name: "ATR_MTI_ID" })
  ATR_MTI?: HeadquarterTopicItem;

  @ManyToOne(() => StudentTest)
  @JoinColumn({ name: "ATR_ALT_ID" })
  ATR_ALT: StudentTest;

  @CreateDateColumn()
  ATR_DT_CRIACAO: Date;
}
