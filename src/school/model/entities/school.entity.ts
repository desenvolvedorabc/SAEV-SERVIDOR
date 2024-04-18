import { County } from "src/counties/model/entities/county.entity";
import { Message } from "src/messages/model/entities/message.entity";
import { ReportEdition } from "src/reports/model/entities/report-edition.entity";
import { SchoolClass } from "src/school-class/model/entities/school-class.entity";
import { Student } from "src/student/model/entities/student.entity";
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
  RelationId,
} from "typeorm";

@Entity({ name: "escola" })
@Index(["ESC_MUN"], { unique: false })
@Index(["ESC_INEP"], { unique: false })
export class School {
  @PrimaryGeneratedColumn("increment")
  ESC_ID: number;

  @Column({
    type: String,
  })
  ESC_UF: string;

  @Column({
    type: String,
  })
  ESC_NOME: string;

  @Column({
    type: String,
  })
  ESC_INEP: string;

  @Column({
    type: String,
  })
  ESC_CIDADE: string;

  @Column({
    type: String,
  })
  ESC_ENDERECO: string;

  @Column({
    type: String,
  })
  ESC_NUMERO: string;

  @Column({
    type: String,
  })
  ESC_COMPLEMENTO: string;

  @Column({
    type: String,
  })
  ESC_BAIRRO: string;

  @Column({
    type: String,
  })
  ESC_CEP: string;

  @Column({
    type: String,
  })
  ESC_LOGO: string;

  @Column()
  ESC_STATUS: string;

  @Column({
    default: () => "1",
  })
  ESC_ATIVO: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  ESC_INTEGRAL: boolean;

  @CreateDateColumn({ type: "timestamp" })
  ESC_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  ESC_DT_ATUALIZACAO: Date;

  @ManyToOne(() => County)
  @JoinColumn({ name: "ESC_MUN_ID" })
  ESC_MUN: County;

  @RelationId((entity: School) => entity.ESC_MUN)
  ESC_MUN_ID: number;

  @OneToMany(() => Student, (student) => student.ALU_ESC)
  ESC_ALU: Student[];

  @OneToMany(() => User, (user) => user.USU_ESC)
  ESC_USU: User[];

  @OneToMany(() => SchoolClass, (schoolClass) => schoolClass.TUR_ESC)
  ESC_TUR: SchoolClass[];

  @ManyToMany(() => Message, (message) => message.schools)
  ESC_MEN: Message[];

  @OneToMany(() => ReportEdition, (edition) => edition.school)
  @JoinColumn()
  reportEditions: ReportEdition[];

  @Column({ nullable: true, unique: true })
  ESC_OLD_ID: number;
}
