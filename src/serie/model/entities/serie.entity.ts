import { SchoolClass } from "src/school-class/model/entities/school-class.entity";
import { Student } from "src/student/model/entities/student.entity";
import { Test } from "src/test/model/entities/test.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "series" })
export class Serie {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  SER_ID: number;

  @Column({
    type: String,
  })
  SER_NOME: string;

  @Column({ nullable: true })
  SER_NUMBER: number;

  @Column({
    default: () => "1",
  })
  SER_ATIVO: boolean;

  @CreateDateColumn({ type: "timestamp" })
  SER_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  SER_DT_ATUALIZACAO: Date;

  @Column({ nullable: true, unique: true })
  SER_OLD_ID: number;

  @OneToMany(() => Student, (student) => student.ALU_SER)
  SER_ALU: Student[];

  @OneToMany(() => Test, (test) => test.TES_SER)
  SER_TES: Test[];

  @OneToMany(() => SchoolClass, (schoolClass) => schoolClass.TUR_SER)
  SER_TUR: SchoolClass[];
}
