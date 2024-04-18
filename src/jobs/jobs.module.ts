import { Module } from "@nestjs/common";
import { JobsController } from "./jobs.controller";
import { JobsService } from "./jobs.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ReportEdition } from "../reports/model/entities/report-edition.entity";
import { ReportSubject } from "../reports/model/entities/report-subject.entity";
import { ReportsModule } from "../reports/reports.module";
import { ReportDescriptor } from "src/reports/model/entities/report-descriptor.entity";
import { BullModule } from "@nestjs/bull";
import { Job } from "./job.entity";
import { ReportNotEvaluated } from "src/reports/model/entities/report-not-evaluated.entity";
import { JobNotEvaluatedService } from "./services/job-not-evaluated.service";
import { JobRaceService } from "./services/job-race.service";
import { ReportRace } from "src/reports/model/entities/report-race.entity";
import { JobRaceRepository } from "./services/repositories/job-race.repository";
import { JobDescriptorsService } from "./services/job-descriptor.service";
import { JobQuestionService } from "./services/job-question.service";
import { ReportQuestion } from "src/reports/model/entities/report-question.entity";
import { ReportQuestionOption } from "src/reports/model/entities/report-question-option.entity";
import { JobSubjectService } from "./services/job-subject.service";
import { JobQuestionRepository } from "./services/repositories/job-question.repository";

@Module({
  imports: [
    ReportsModule,
    TypeOrmModule.forFeature([
      ReportEdition,
      ReportSubject,
      ReportDescriptor,
      ReportNotEvaluated,
      ReportRace,
      ReportQuestion,
      ReportQuestionOption,
      Job,
    ]),
    BullModule.registerQueue({
      name: "job",
    }),
  ],
  providers: [
    JobsService,
    JobNotEvaluatedService,
    JobRaceService,
    JobRaceRepository,
    JobQuestionRepository,
    JobDescriptorsService,
    JobQuestionService,
    JobSubjectService
  ],
  controllers: [JobsController],
})
export class JobsModule {}
