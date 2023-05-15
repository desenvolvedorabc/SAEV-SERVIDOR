import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { SubProfile } from "./sub-profile.entity";

@Entity({ name: "perfil_base" })
export class ProfileBase {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  PER_ID: number;

  @Column({
    type: String,
  })
  PER_NOME: string;

  @Column({
    default: () => "1",
  })
  PER_ATIVO: boolean;

  @CreateDateColumn({ type: "timestamp" })
  PER_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  PER_DT_ATUALIZACAO: Date;

  @OneToMany(() => SubProfile, (subProfile) => subProfile.SPE_PER)
  subProfile: SubProfile[];
}
