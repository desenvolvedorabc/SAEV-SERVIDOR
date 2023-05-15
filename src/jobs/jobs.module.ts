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
import { JobConsumer } from "./job.consumer";

@Module({
  imports: [
    ReportsModule,
    TypeOrmModule.forFeature([
      ReportEdition,
      ReportSubject,
      ReportDescriptor,
      Job,
    ]),
    BullModule.registerQueue({
      name: "job",
    }),
  ],
  providers: [JobsService, JobConsumer],
  controllers: [JobsController],
})
export class JobsModule {}
