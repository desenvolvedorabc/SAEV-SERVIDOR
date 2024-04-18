import { County } from "src/counties/model/entities/county.entity";
import { ReportEdition } from "src/reports/model/entities/report-edition.entity";
import { School } from "src/school/model/entities/school.entity";
import { Serie } from "src/serie/model/entities/serie.entity";
import { Student } from "src/student/model/entities/student.entity";
import { Teacher } from "src/teacher/model/entities/teacher.entity";
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
  Index,
  RelationId,
} from "typeorm";
import { SchoolClassStudent } from "./school-class-student.entity";

@Entity({ name: "turma" })
@Index(
  ["TUR_ESC", "TUR_SER", "TUR_PERIODO", "TUR_TIPO", "TUR_NOME", "TUR_ANO"],
  {
    unique: false,
  },
)
@Index(["TUR_ESC"], { unique: false })
export class SchoolClass {
  @PrimaryGeneratedColumn("increment")
  TUR_ID: number;

  @Column({
    type: String,
    length: 4,
  })
  TUR_ANO: string;

  @ManyToOne(() => County)
  @JoinColumn({ name: "TUR_MUN_ID" })
  TUR_MUN: County;

  @ManyToOne(() => School)
  @JoinColumn({ name: "TUR_ESC_ID" })
  TUR_ESC: School;

  @ManyToOne(() => Serie)
  @JoinColumn({ name: "TUR_SER_ID" })
  TUR_SER: Serie;

  @RelationId((entity: SchoolClass) => entity.TUR_SER)
  TUR_SER_ID: number;

  @OneToMany(
    () => SchoolClassStudent,
    (schoolClassStudent) => schoolClassStudent.schoolClass,
  )
  students: SchoolClassStudent[];

  @OneToMany(() => Student, (student) => student.ALU_TUR)
  studentsAll: Student[];

  @Column({
    type: String,
    length: 16,
  })
  TUR_PERIODO: string;

  @Column({
    type: 'boolean',
    default: false
  })
  TUR_ANEXO: boolean;

  @Column({
    type: String,
    length: 16,
    comment:
      "Campo destinado a informar o tipo da turma: Regular ou Multisseriada.",
  })
  TUR_TIPO: string;

  @Column({
    type: String,
  })
  TUR_NOME: string;

  @Column({
    default: () => "1",
  })
  TUR_ATIVO: boolean;

  @CreateDateColumn({ type: "timestamp" })
  TUR_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  TUR_DT_ATUALIZACAO: Date;

  @Column({ nullable: true, unique: true })
  TUR_OLD_ID: number;

  @ManyToMany(() => Teacher)
  @JoinTable({
    name: "turma_professor",
    joinColumn: {
      name: "TUR_ID",
    },
    inverseJoinColumn: {
      name: "PRO_ID",
    },
  })
  TUR_PRO: Teacher[];

  @OneToMany(() => ReportEdition, (edition) => edition.schoolClass)
  @JoinColumn()
  reportEditions: ReportEdition[];
}
