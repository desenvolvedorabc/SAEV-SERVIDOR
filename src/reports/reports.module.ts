import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Assessment } from "src/assessment/model/entities/assessment.entity";
import { County } from "src/counties/model/entities/county.entity";
import { Test } from "src/test/model/entities/test.entity";
import { StudentTest } from "src/release-results/model/entities/student-test.entity";
import { SchoolClass } from "src/school-class/model/entities/school-class.entity";
import { School } from "src/school/model/entities/school.entity";
import { Serie } from "src/serie/model/entities/serie.entity";
import { Student } from "src/student/model/entities/student.entity";
import { ReportsController } from "./controller/reports.controller";
import { ReportsService } from "./service/reports.service";
import { Headquarter } from "src/headquarters/model/entities/headquarter.entity";
import { ReportEdition } from "./model/entities/report-edition.entity";
import { ReportSubject } from "./model/entities/report-subject.entity";
import { GeneralSynthesisService } from "./service/general-synthesis.service";
import { EvolutionaryLineService } from "./service/evolutionary-line.service";
import { ReleasesService } from "./service/releases.service";
import { GroupingService } from "./service/grouping.service";
import { ResultByDescriptorsService } from "./service/result-by-descriptors.service";
import { PerformanceLevelService } from "./service/performance-level.service";
import { ReleaseResultsModule } from "src/release-results/release-results.module";
import { SchoolClassStudent } from "../school-class/model/entities/school-class-student.entity";
import { ReportDescriptor } from "./model/entities/report-descriptor.entity";
import { ReportNotEvaluated } from "./model/entities/report-not-evaluated.entity";
import { NotEvaluatedService } from "./service/not-evaluated.service";
import { ReportRace } from "./model/entities/report-race.entity";
import { ReportRaceService } from "./service/race.service";
import { ReportSyntheticService } from "./service/synthetic.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      County,
      Student,
      SchoolClass,
      SchoolClassStudent,
      Serie,
      School,
      Assessment,
      StudentTest,
      Test,
      Headquarter,
      ReportEdition,
      ReportSubject,
      ReportDescriptor,
      ReportNotEvaluated,
      ReportRace
    ]),
    ReleaseResultsModule,
  ],
  providers: [
    ReportsService,
    GeneralSynthesisService,
    EvolutionaryLineService,
    ReleasesService,
    GroupingService,
    ResultByDescriptorsService,
    PerformanceLevelService,
    NotEvaluatedService,
    ReportRaceService,
    ReportSyntheticService,
  ],
  controllers: [ReportsController],
  exports: [EvolutionaryLineService, ReportsService],
})
export class ReportsModule {}
