import { SchoolClass } from "src/school-class/model/entities/school-class.entity";
import { Student } from "src/student/model/entities/student.entity";
import { Test } from "src/test/model/entities/test.entity";
import { User } from "src/user/model/entities/user.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { StudentTestAnswer } from "./student-test-answer.entity";

@Index(["ALT_ALU", "ALT_TES"], { unique: true })
@Index(["ALT_ALU", "ALT_TES", 'schoolClass'], { unique: false })
@Entity({ name: "aluno_teste" })
export class StudentTest {
  @PrimaryGeneratedColumn("increment")
  ALT_ID: number;

  @Column({
    default: () => "1",
  })
  ALT_ATIVO: boolean;

  @ManyToOne(() => Test)
  @JoinColumn({ name: "ALT_TES_ID" })
  ALT_TES: Test;

  @ManyToOne(() => Student)
  @JoinColumn({ name: "ALT_ALU_ID" })
  ALT_ALU: Student;

  @Column({
    default: () => "0",
  })
  ALT_FINALIZADO: boolean;

  @ManyToOne(() => SchoolClass)
  schoolClass: SchoolClass;

  @CreateDateColumn({ type: "timestamp" })
  ALT_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  ALT_DT_ATUALIZACAO: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: "ALT_USU_ID" })
  ALT_USU: User;

  @OneToMany(() => StudentTestAnswer, (answers) => answers.ATR_ALT)
  ANSWERS_TEST: StudentTestAnswer[];

  @Column({default: false})
  ALT_BY_HERBY: boolean;

  @Column({default: false})
  ALT_BY_EDLER: boolean;

  @Column({default: false})
  ALT_BY_AVA_ONLINE: boolean;

  @Column({
    comment: 'Campo destinado a justificar caso o aluno não tenha realizado o teste',
    nullable: true
  })
  ALT_JUSTIFICATIVA: string;
}
