import { Assessment } from 'src/modules/assessment/model/entities/assessment.entity'
import { TypeAssessmentEnum } from 'src/modules/assessment/model/enum/type-assessment.enum'
import { County } from 'src/modules/counties/model/entities/county.entity'
import { Regional } from 'src/modules/regional/model/entities/regional.entity'
import { School } from 'src/modules/school/model/entities/school.entity'
import { SchoolClass } from 'src/modules/school-class/model/entities/school-class.entity'
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { ReportDescriptor } from './report-descriptor.entity'
import { ReportNotEvaluated } from './report-not-evaluated.entity'
import { ReportSubject } from './report-subject.entity'

@Entity({ name: 'report_edition' })
@Index(['schoolClass'], { unique: false })
@Index(['school'], { unique: false })
@Index(['county'], { unique: false })
@Index(['regional'], { unique: false })
@Index(['type'], { unique: false })
@Index(['schoolClass', 'school', 'county', 'regional', 'type'], {
  unique: false,
})
export class ReportEdition {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({ nullable: true })
  regionalId: number

  @Column({
    type: 'enum',
    enum: TypeAssessmentEnum,
    default: TypeAssessmentEnum.MUNICIPAL,
  })
  type: TypeAssessmentEnum

  @ManyToOne(() => SchoolClass, (schoolClass) => schoolClass.reportEditions)
  schoolClass: SchoolClass

  @ManyToOne(() => Regional, (regional) => regional.reportEditions)
  @JoinColumn({ name: 'regionalId' })
  regional: Regional

  @ManyToOne(() => School, (school) => school.reportEditions)
  school: School

  @ManyToOne(() => County, (county) => county.report_editions)
  county: County

  @ManyToOne(() => Assessment)
  @JoinColumn()
  edition: Assessment

  @OneToMany(() => ReportSubject, (subject) => subject.reportEdition)
  @JoinColumn()
  reportsSubjects: ReportSubject[]

  @OneToMany(() => ReportDescriptor, (descriptor) => descriptor.report_edition)
  @JoinColumn()
  reports_descriptors: ReportDescriptor[]

  @OneToMany(
    () => ReportNotEvaluated,
    (notEvaluated) => notEvaluated.reportEdition,
  )
  @JoinColumn()
  reports_not_evaluated: ReportNotEvaluated[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
