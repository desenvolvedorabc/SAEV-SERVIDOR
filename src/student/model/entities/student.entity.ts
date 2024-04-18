import { StudentTest } from "src/release-results/model/entities/student-test.entity";
import { SchoolAbsence } from "src/school-absences/model/entities/school-absences.entity";
import { SchoolClass } from "src/school-class/model/entities/school-class.entity";
import { SchoolClassStudent } from "src/school-class/model/entities/school-class-student.entity";
import { School } from "src/school/model/entities/school.entity";
import { Serie } from "src/serie/model/entities/serie.entity";
import { Pcd } from "src/shared/model/entities/pcd.entity";
import { Gender } from "src/teacher/model/entities/gender.entity";
import { Skin } from "src/teacher/model/entities/skin.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from "typeorm";
import { UF } from "../../../shared/enums/uf.enum";
import { IStudent } from "../interface/student.interface";

@Entity({ name: "aluno" })
@Index(["ALU_ESC"], { unique: false })
@Index(["ALU_STATUS", "ALU_ESC"], { unique: false })
@Index(["ALU_NOME", "ALU_NOME_MAE"], { unique: false })
@Index(["ALU_INEP"], { unique: false })
@Index(["ALU_CPF"], { unique: false })
export class Student {
  @PrimaryGeneratedColumn("increment")
  ALU_ID: number;

  @ManyToOne(() => School, (school) => school.ESC_ALU)
  @JoinColumn({ name: "ALU_ESC_ID" })
  ALU_ESC: School;

  @ManyToOne(() => Serie, (serie) => serie.SER_ALU)
  @JoinColumn({ name: "ALU_SER_ID" })
  ALU_SER: Serie;

  @ManyToOne(() => SchoolClass, (schoolClass) => schoolClass.students)
  @JoinColumn({ name: "ALU_TUR_ID" })
  ALU_TUR: SchoolClass;

  @RelationId((entity: Student) => entity.ALU_TUR)
  ALU_TUR_ID: number;

  @OneToMany(
    () => SchoolClassStudent,
    (schoolClassStudent) => schoolClassStudent.student,
  )
  schoolClasses: SchoolClassStudent[];

  @Column({
    type: "text",
    nullable: true,
  })
  ALU_AVATAR: string;

  @Column({
    type: String,
    nullable: true,
  })
  ALU_CPF: string;

  @Column({
    type: String,
    length: 32,
  })
  ALU_INEP: string;

  @Column({
    type: String,
  })
  // @Index({ fulltext: true })
  ALU_NOME: string;

  @ManyToOne(() => Gender)
  @JoinColumn({ name: "ALU_GEN_ID" })
  ALU_GEN: Gender;

  @Column({
    type: String,
  })
  ALU_NOME_MAE: string;

  @Column({
    type: String,
  })
  ALU_NOME_PAI: string;

  @Column({
    type: String,
  })
  ALU_NOME_RESP: string;

  @Column({
    type: String,
    length: 16,
  })
  ALU_TEL1: string;

  @Column({
    type: String,
    length: 16,
  })
  ALU_TEL2: string;

  @Column({
    type: String,
  })
  ALU_EMAIL: string;

  @Column({
    type: String,
  })
  ALU_DEFICIENCIA_BY_IMPORT: string;

  @ManyToMany(() => Pcd, pcd => pcd.students)
  @JoinTable()
  ALU_DEFICIENCIAS: Pcd[];

  @ManyToOne(() => Pcd)
  @JoinColumn({ name: "ALU_PCD_ID" })
  ALU_PCD: Pcd;

  @ManyToOne(() => Skin)
  @JoinColumn({ name: "ALU_PEL_ID" })
  ALU_PEL: Skin;

  @Column({
    type: String,
    length: 20,
  })
  ALU_DT_NASC: string;

  @Column({
    type: "enum",
    enum: UF,
  })
  ALU_UF: UF;

  @Column({
    type: String,
    length: 60,
  })
  ALU_CIDADE: string;

  @Column({
    type: String,
  })
  ALU_ENDERECO: string;

  @Column({
    type: String,
    length: 10,
  })
  ALU_NUMERO: string;

  @Column({
    type: String,
  })
  ALU_COMPLEMENTO: string;

  @Column({
    type: String,
  })
  ALU_BAIRRO: string;

  @Column({
    type: String,
    length: 10,
  })
  ALU_CEP: string;

  @Column({
    comment:
      'Campo destinado a informar se o aluno está enturmado ou não enturmado. Opções: "Enturmado" ou "Não Enturmado"',
  })
  ALU_STATUS: string;

  @Column({
    default: () => "1",
  })
  ALU_ATIVO: boolean;

  @CreateDateColumn({ type: "timestamp" })
  ALU_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  ALU_DT_ATUALIZACAO: Date;

  @Column({ nullable: true, unique: true })
  ALU_OLD_ID: number;

  @Column({ nullable: true, unique: true })
  ALU_COD: number;

  @OneToMany(() => StudentTest, (test) => test.ALT_ALU)
  TESTS_STUDENT: StudentTest[];

  @OneToMany(() => SchoolAbsence, (absences) => absences.IFR_ALU)
  SCHOOL_ABSENCES: SchoolAbsence[];
}
