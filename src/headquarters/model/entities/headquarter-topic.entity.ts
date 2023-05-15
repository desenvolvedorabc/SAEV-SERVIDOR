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
import { HeadquarterTopicItem } from "./headquarter-topic-item.entity";
import { Headquarter } from "./headquarter.entity";

@Entity({ name: "matriz_referencia_topico" })
export class HeadquarterTopic {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  MTO_ID: number;

  @Column({
    type: String,
  })
  MTO_NOME: string;

  @Column({
    default: () => "1",
  })
  MTO_ATIVO: boolean;

  @CreateDateColumn({ type: "timestamp" })
  MTO_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  MTO_DT_ATUALIZACAO: Date;

  @ManyToOne(() => Headquarter, (_topic) => HeadquarterTopic)
  @JoinColumn({ name: "MTO_MAR_ID" })
  MTO_MAR: Headquarter;

  @OneToMany(() => HeadquarterTopicItem, (topic) => topic.MTI_MTO)
  MTO_MTI: HeadquarterTopicItem[];

  @Column({ nullable: true, unique: true })
  MTO_OLD_ID: number;
}
