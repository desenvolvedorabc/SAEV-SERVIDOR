import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { JobType } from "./job-type.enum";

@Entity()
export class Job {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column()
  assessmentId?: number;

  @Column()
  countyId?: number;

  @Column()
  bullId: string;

  @Column("enum", { enum: JobType })
  jobType: JobType;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt: Date;
}
