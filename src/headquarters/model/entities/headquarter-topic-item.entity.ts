import { TestTemplate } from "src/test/model/entities/test-template.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { HeadquarterTopic } from "./headquarter-topic.entity";

@Entity({ name: "matriz_referencia_topico_items" })
export class HeadquarterTopicItem {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  MTI_ID: number;

  @Column({
    type: String,
    comment: 'Campo destinado a informar o código do item do tópico'
  })
  MTI_CODIGO: string;

  @Column({ type: "text", comment: 'Campo destinado a informar a descrição do item do tópico' })
  MTI_DESCRITOR: string;

  @Column({
    default: () => "1",
  })
  MTI_ATIVO: boolean;

  @CreateDateColumn({ type: "timestamp" })
  MTI_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  MTI_DT_ATUALIZACAO: Date;

  @ManyToOne(() => HeadquarterTopic)
  @JoinColumn({ name: "MTI_MTO_ID" })
  MTI_MTO: HeadquarterTopic;

  @OneToMany(
    () => TestTemplate,
    (testsTemplate: TestTemplate) => testsTemplate.TEG_MTI,
  )
  testsTemplate: TestTemplate[];

  @Column({ nullable: true, unique: true })
  MTI_OLD_ID: number;
}
