import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { RoleExternalReport } from "../dto/role-external-report.enum";

@Entity({
  name: "external_reports",
})
export class ExternalReport {
  @PrimaryGeneratedColumn("increment", { type: "mediumint" })
  id: number;

  @Column({ type: "varchar", nullable: false })
  name: string;

  @Column({ type: "varchar", nullable: false })
  category: string;

  @Column({ type: "enum", enum: RoleExternalReport, nullable: false })
  role: RoleExternalReport;

  @Column({ type: "varchar", nullable: false })
  link: string;

  @Column({ type: "longtext", nullable: true })
  description: string;

  @Column({ type: "boolean", default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
