import { ReportRace } from "src/reports/model/entities/report-race.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "raca" })
export class Skin {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  PEL_ID: number;

  @Column({
    type: String,
  })
  PEL_NOME: string;

  @Column({
    default: () => "1",
  })
  PEL_ATIVO: boolean;

  @CreateDateColumn({ type: "timestamp" })
  PEL_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  PEL_DT_ATUALIZACAO: Date;

  @Column({ nullable: true, unique: true })
  PEL_OLD_ID: number;

  @OneToMany(() => ReportRace, (reportRace) => reportRace.race)
  @JoinColumn()
  reportRaces: ReportRace
}
