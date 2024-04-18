import { Assessment } from "src/assessment/model/entities/assessment.entity";
import { Headquarter } from "src/headquarters/model/entities/headquarter.entity";
import { StudentTest } from "src/release-results/model/entities/student-test.entity";
import { ReportSubject } from "src/reports/model/entities/report-subject.entity";
import { Serie } from "src/serie/model/entities/serie.entity";
import { Subject } from "src/subject/model/entities/subject.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { TestTemplate } from "./test-template.entity";
import { AssessmentOnline } from "src/assessment-online/entities/assessment-online.entity";

@Entity({ name: "teste" })
export class Test {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  TES_ID: number;

  @Column({
    type: String,
  })
  TES_NOME: string;

  @Column({
    type: String,
  })
  TES_ANO: string;

  @Column({
    default: () => "1",
  })
  TES_ATIVO: boolean;

  @ManyToOne(() => Subject, { eager: true })
  @JoinColumn({ name: "TES_DIS_ID" })
  TES_DIS: Subject;

  @ManyToOne(() => Headquarter, { eager: true })
  @JoinColumn({ name: "TES_MAR_ID" })
  TES_MAR: Headquarter;

  @ManyToOne(() => Serie, { eager: true })
  @JoinColumn({ name: "TES_SER_ID" })
  TES_SER: Serie;

  @OneToMany(() => StudentTest, (student) => student.ALT_TES)
  STUDENTS_TEST: StudentTest[];

  @OneToMany(() => TestTemplate, (template) => template.TEG_TES)
  TEMPLATE_TEST: TestTemplate[];

  @OneToOne(() => AssessmentOnline, assessmentOnline => assessmentOnline.test)
  @JoinColumn()
  assessmentOnline: AssessmentOnline;

  @Column({
    type: String,
    nullable: true,
  })
  TES_ARQUIVO: string;

  @Column({
    type: String,
    nullable: true,
  })
  TES_MANUAL: string;

  @CreateDateColumn({ type: "timestamp" })
  TES_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  TES_DT_ATUALIZACAO: Date;

  @ManyToMany(() => Assessment, (assesment) => assesment.AVA_TES)
  TES_ASSESMENTS: Assessment[];

  @OneToMany(() => TestTemplate, (tests) => tests)
  TES_TEG: TestTemplate[];

  @OneToMany(() => ReportSubject, (subject) => subject.test)
  report_tests: ReportSubject[];

  @Column({ nullable: true, unique: true })
  TES_OLD_ID: number;
}
