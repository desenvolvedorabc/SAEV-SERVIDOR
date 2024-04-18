import { Student } from "src/student/model/entities/student.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "pcd" })
export class Pcd {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  PCD_ID: number;

  @Column({
    type: String,
  })
  PCD_NOME: string;

  @Column({
    default: () => "1",
  })
  PCD_ATIVO: boolean;

  @ManyToMany(() => Student, student => student.ALU_DEFICIENCIAS)
  students: Student[]

  @Column({ nullable: true, unique: true })
  PCD_OLD_ID: number;

  @CreateDateColumn({ type: "timestamp" })
  PCD_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  PCD_DT_ATUALIZACAO: Date;
}
