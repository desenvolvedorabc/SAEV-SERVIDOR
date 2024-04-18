import { HeadquarterTopicItem } from "src/headquarters/model/entities/headquarter-topic-item.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Test } from "./test.entity";

@Entity({ name: "teste_gabarito" })
export class TestTemplate {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  TEG_ID: number;

  @Column({
    type: String,
  })
  TEG_RESPOSTA_CORRETA: string;

  @CreateDateColumn({ type: "timestamp" })
  TEG_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  TEG_DT_ATUALIZACAO: Date;

  @Column({
    type: Number,
  })
  TEG_ORDEM: number;

  @Column({ nullable: true, unique: true })
  TEG_OLD_ID: number;

  @ManyToOne(
    () => HeadquarterTopicItem,
    (headquarterTopicItem) => headquarterTopicItem.testsTemplate,
  )
  @JoinColumn({ name: "TEG_MTI_ID" })
  TEG_MTI: HeadquarterTopicItem;

  @ManyToOne(() => Test, (_template) => TestTemplate)
  @JoinColumn({ name: "TEG_TES_ID" })
  TEG_TES: Test;
}
