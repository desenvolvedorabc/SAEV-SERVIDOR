import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { HeadquarterTopic } from "./headquarter-topic.entity";
import { Test } from "src/test/model/entities/test.entity";
import { Subject } from "src/subject/model/entities/subject.entity";
import { Serie } from "src/serie/model/entities/serie.entity";

@Entity({ name: "matriz_referencia" })
export class Headquarter {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  MAR_ID: number;

  @Column({
    type: String,
  })
  MAR_NOME: string;

  @Column({
    default: () => "1",
  })
  MAR_ATIVO: boolean;

  @CreateDateColumn({ type: "timestamp" })
  MAR_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  MAR_DT_ATUALIZACAO: Date;

  @ManyToOne(() => Subject, (_headquarter) => Headquarter, {
    eager: true,
  })
  @JoinColumn({ name: "MAR_DIS_ID" })
  MAR_DIS: Subject;

  @ManyToMany(() => Serie)
  @JoinTable({
    name: "matriz_referencia_serie",
    joinColumn: {
      name: "MAR_ID",
    },
    inverseJoinColumn: {
      name: "SER_ID",
    },
  })
  MAR_SER: Serie[];

  @OneToMany(() => HeadquarterTopic, (headquarters) => headquarters.MTO_MAR)
  MAR_MTO: HeadquarterTopic[];

  @OneToMany(() => Test, (tests) => tests.TES_MAR)
  TES_MAR: HeadquarterTopic[];

  @Column({ nullable: true, unique: true })
  MAR_OLD_ID: number;
}
