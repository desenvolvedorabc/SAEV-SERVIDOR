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

@Entity({ name: "notifications" })
export class Notification {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  id: number;

  @Column({
    type: String,
    nullable: false,
    comment: 'Campo destinado a informar o título da notificicação'
  })
  title: string;

  @Column({
    type: "longtext",
    nullable: false,
    comment: 'Campo destinado a informar o corpo da notificação'
  })
  message: string;

  @Column({
    default: false,
    comment: 'Campo destinado a informar se a notificação foi lida'
  })
  isReading: boolean;

  @ManyToOne(() => User, (user) => user.notifications)
  @JoinColumn()
  user: User;

  @CreateDateColumn({ type: "timestamp", comment: 'Campo destinado a informar quando a notificação foi criada' })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp", comment: 'Campo destinado a informar quando a notificação foi atualizada' })
  updateAt: Date;
}
