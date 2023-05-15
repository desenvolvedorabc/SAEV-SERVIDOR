import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user.entity";

@Entity({
  name: "forget_password",
})
export class ForgetPassword {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  id: number;

  @OneToOne(() => User)
  @JoinColumn()
  user: User;

  @Column()
  token: string;

  @Column({ nullable: false, type: "boolean" })
  isValid: boolean;

  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt: Date;
}
