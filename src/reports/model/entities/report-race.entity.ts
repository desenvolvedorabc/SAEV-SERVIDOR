import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ReportSubject } from "./report-subject.entity";
import { Skin } from "src/teacher/model/entities/skin.entity";

@Entity({ name: "report_race" })
export class ReportRace {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column()
  name: string;

  @Column({
    type: "int",
    default: 0,
  })
  countTotalStudents: number;

  @Column('simple-array', { nullable: true })
  idStudents: string[];

  @Column({
    type: "int",
    default: 0,
  })
  countStudentsLaunched: number;

  @Column({
    type: "int",
    default: 0,
  })
  countPresentStudents: number;

  @Column({
    type: "int",
    default: 0,
  })
  totalGradesStudents: number;

  @Column({
    type: "int",
    default: 0,
  })
  fluente: number;

  @Column({
    type: "int",
    default: 0,
  })
  nao_fluente: number;

  @Column({
    type: "int",
    default: 0,
  })
  frases: number;

  @Column({
    type: "int",
    default: 0,
  })
  palavras: number;

  @Column({
    type: "int",
    default: 0,
  })
  silabas: number;

  @Column({
    type: "int",
    default: 0,
  })
  nao_leitor: number;

  @Column({
    type: "int",
    default: 0,
  })
  nao_avaliado: number;

  @Column({
    type: "int",
    default: 0,
  })
  nao_informado: number;

  @ManyToOne(() => ReportSubject, (reportSubject) => reportSubject.reportRaces, {
    onDelete: "CASCADE",
  })
  reportSubject: ReportSubject;

  @ManyToOne(() => Skin, (skin) => skin.reportRaces)
  race: Skin

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
