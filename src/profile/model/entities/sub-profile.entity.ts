import { Area } from "src/area/model/entities/area.entity";
import { User } from "src/user/model/entities/user.entity";
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
} from "typeorm";
import { ProfileBase } from "./profile-base.entity";

@Entity({ name: "sub_perfil" })
export class SubProfile {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  SPE_ID: number;

  @Column({
    type: String,
  })
  SPE_NOME: string;

  @Column({
    default: () => "1",
  })
  SPE_ATIVO: boolean;

  @CreateDateColumn({ type: "timestamp" })
  SPE_DT_CRIACAO: Date;

  @UpdateDateColumn({ type: "timestamp" })
  SPE_DT_ATUALIZACAO: Date;

  @ManyToOne(() => ProfileBase, (profileBase) => profileBase.subProfile, {
    eager: true,
  })
  @JoinColumn({ name: "SPE_PER_ID" })
  SPE_PER: ProfileBase;

  @ManyToMany(() => Area)
  @JoinTable({
    name: "sub_perfil_area",
    joinColumn: {
      name: "SPE_ID",
    },
    inverseJoinColumn: {
      name: "ARE_ID",
    },
  })
  AREAS: Area[];

  @OneToMany(() => User, (_profile) => SubProfile)
  user: User;
}
