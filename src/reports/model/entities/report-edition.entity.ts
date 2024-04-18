import { Assessment } from "src/assessment/model/entities/assessment.entity";
import { County } from "src/counties/model/entities/county.entity";
import { SchoolClass } from "src/school-class/model/entities/school-class.entity";
import { School } from "src/school/model/entities/school.entity";
import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ReportDescriptor } from "./report-descriptor.entity";
import { ReportSubject } from "./report-subject.entity";
import { ReportNotEvaluated } from "./report-not-evaluated.entity";

@Entity({ name: "report_edition" })
@Index(["schoolClass"], { unique: false })
@Index(["school"], { unique: false })
@Index(["county"], { unique: false })
@Index(["schoolClass", "school", "county"], { unique: false })
export class ReportEdition {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @ManyToOne(() => SchoolClass, (schoolClass) => schoolClass.reportEditions)
  schoolClass: SchoolClass;

  @ManyToOne(() => School, (school) => school.reportEditions)
  school: School;

  @ManyToOne(() => County, (county) => county.report_editions)
  county: County;

  @ManyToOne(() => Assessment)
  @JoinColumn()
  edition: Assessment;

  @OneToMany(() => ReportSubject, (subject) => subject.reportEdition)
  @JoinColumn()
  reportsSubjects: ReportSubject[];

  @OneToMany(() => ReportDescriptor, (descriptor) => descriptor.report_edition)
  @JoinColumn()
  reports_descriptors: ReportDescriptor[];

  @OneToMany(() => ReportNotEvaluated, (notEvaluated) => notEvaluated.reportEdition)
  @JoinColumn()
  reports_not_evaluated: ReportNotEvaluated[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
