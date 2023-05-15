import { County } from "src/counties/model/entities/county.entity";
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Formation } from "./formation.entity";
import { Gender } from "./gender.entity";
import { Skin } from "./skin.entity";

@Entity({ name: "professor" })
@Index(["PRO_MUN"], { unique: false })
export class Teacher {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  PRO_ID: number;

  @Column({
    type: String,
  })
  PRO_NOME: string;

  @Column({
    type: String,
    length: 191,
  })
  PRO_EMAIL: string;

  @Column({
    type: String,
  })
  PRO_FONE: string;

  @Column({
    type: String,
    comment: 'Campo destinado a informar a informar o CPF'
  })
  PRO_DOCUMENTO: string;

  @ManyToOne(() => Formation, (formation) => formation.FOR_PRO)
  @JoinColumn({ name: "PRO_FOR_ID" })
  PRO_FOR: Formation;

  @Column({
    type: Date,
  })
  PRO_DT_NASC: Date;

  @ManyToOne(() => Gender, (gender) => gender.GEN_PRO)
  @JoinColumn({ name: "PRO_GEN_ID" })
  PRO_GEN: Gender;

  @ManyToOne(() => Skin)
  @JoinColumn({ name: "PRO_PEL_ID" })
  PRO_PEL: Skin;

  @Column({
    default: () => "1",
  })
  PRO_ATIVO: boolean;

  @CreateDateColumn({ type: "timestamp" })
  PRO_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  PRO_DT_ATUALIZACAO: Date;

  @Column({
    type: String,
  })
  PRO_AVATAR: string;

  @Column({
    type: String,
  })
  PRO_UF: string;

  @Column({
    type: String,
  })
  PRO_CIDADE: string;

  @Column({
    type: String,
  })
  PRO_ENDERECO: string;

  @Column({
    type: String,
  })
  PRO_NUMERO: string;

  @Column({
    type: String,
  })
  PRO_COMPLEMENTO: string;

  @Column({
    type: String,
  })
  PRO_BAIRRO: string;

  @Column({
    type: String,
  })
  PRO_CEP: string;

  @ManyToOne(() => County)
  @JoinColumn({ name: "PRO_MUN_ID" })
  PRO_MUN: County;

  @Column({ nullable: true, unique: true })
  PRO_OLD_ID: number;

  @BeforeInsert()
  @BeforeUpdate()
  emailToLowerCase() {
    this.PRO_EMAIL = this.PRO_EMAIL.toLowerCase();
  }
}
