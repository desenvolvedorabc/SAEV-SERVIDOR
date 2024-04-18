import { County } from "src/counties/model/entities/county.entity";
import { User } from "src/user/model/entities/user.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { TypeMicrodata } from "../dto/type-microdata.enum";

@Entity({
  name: "microdata",
})
export class Microdatum {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  id: number;

  @Column({
    type: "enum",
    enum: TypeMicrodata,
  })
  type: TypeMicrodata;

  @Column({
    type: "varchar",
  })
  file: string;

  @ManyToOne(() => County)
  county: County;

  @ManyToOne(() => User)
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
