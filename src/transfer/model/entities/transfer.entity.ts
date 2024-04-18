import { SchoolClass } from "src/school-class/model/entities/school-class.entity";
import { School } from "src/school/model/entities/school.entity";
import { Student } from "src/student/model/entities/student.entity";
import { User } from "src/user/model/entities/user.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "transferencia" })
export class Transfer {
  @PrimaryGeneratedColumn("increment")
  TRF_ID: number;

  @ManyToOne(() => Student)
  @JoinColumn({ name: "TRF_ALU_ID" })
  TRF_ALU: Student;

  @ManyToOne(() => School)
  @JoinColumn({ name: "TRF_ESC_ID_ORIGEM" })
  TRF_ESC_ORIGEM: School;

  @ManyToOne(() => School)
  @JoinColumn({ name: "TRF_ESC_ID_DESTINO" })
  TRF_ESC_DESTINO: School;

  @ManyToOne(() => SchoolClass)
  @JoinColumn({ name: "TRF_TUR_ID_ORIGEM" })
  TRF_TUR_ORIGEM: SchoolClass;

  @ManyToOne(() => SchoolClass)
  @JoinColumn({ name: "TRF_TUR_ID_DESTINO" })
  TRF_TUR_DESTINO: SchoolClass;

  @Column({
    type: String,
    nullable: true,
    comment: 'Campo destinado a informar o status da transferência'
  })
  TRF_STATUS: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "TRF_USU_STATUS" })
  TRF_USU_STATUS: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: "TRF_USU" })
  TRF_USU: User;

  @Column({
    type: String,
    nullable: true,
    comment: 'Campo destinado a informar a justificativa da transferência'
  })
  TRF_JUSTIFICATIVA: string;

  @CreateDateColumn({ type: "timestamp" })
  TRF_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  TRF_DT_ATUALIZACAO: Date;

  @Column({ nullable: true, unique: true })
  TRF_OLD_ID: number;
}
