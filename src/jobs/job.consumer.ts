import { Processor, Process } from "@nestjs/bull";
import { InjectRepository } from "@nestjs/typeorm";
import { Job } from "bull";
import { Job as SAEVJob } from "./job.entity";

import { JobsService } from "./jobs.service";
import { Repository } from "typeorm";
import { JobDto } from "./job.dto";
import { JobType } from "./job-type.enum";

@Processor("job")
export class JobConsumer {
  constructor(
    private readonly jobsService: JobsService,
    @InjectRepository(SAEVJob)
    private readonly jobsRepository: Repository<SAEVJob>,
  ) {}

  @Process({ concurrency: 10 })
  async processJob(job: Job<JobDto>) {
    console.log(
      `Generating report editions for Assessment ${job.data.assessmentId} and County ${job.data.countyId}`,
    );
    const jobHistory = this.jobsRepository.create({
      bullId: job.id.toString(),
      assessmentId: job.data?.assessmentId,
      countyId: job.data?.countyId,
      jobType: job.data.jobType,
      startDate: new Date(),
    });
    const newJobHistory = await this.jobsRepository.save(jobHistory);

    switch (newJobHistory.jobType) {
      case JobType.REPORT_EDITION_SCHOOL_CLASS:
        if (!newJobHistory.assessmentId || !newJobHistory.countyId) break;
        await this.jobsService.generateReportEditionsBySchoolClasses(
          newJobHistory.assessmentId,
          newJobHistory.countyId,
        );
        break;
      case JobType.REPORT_SUBJECT_SCHOOL:
        if (!newJobHistory.assessmentId || !newJobHistory.countyId) break;
        await this.jobsService.generateReportEditionsBySchool(
          newJobHistory.assessmentId,
          newJobHistory.countyId,
        );
        break;
      case JobType.REPORT_SUBJECT_COUNTY:
        await this.jobsService.generateReportEditionsByCounty();
        break;
      case JobType.REPORT_SUBJECT_EDITION:
        await this.jobsService.generateReportEditionsByEdition();
        break;
      case JobType.REPORT_DESCRIPTORS_SCHOOL:
        if (!newJobHistory.assessmentId || !newJobHistory.countyId) break;
        await this.jobsService.generateReportEditionsWithReportDescriptorsBySchool(
          newJobHistory.assessmentId,
          newJobHistory.countyId,
        );
        break;
      case JobType.REPORT_DESCRIPTORS_COUNTY:
        await this.jobsService.generateReportEditionsWithReportsDescriptorsByCounty();
        break;
      case JobType.REPORT_DESCRIPTORS_EDITION:
        await this.jobsService.generateReportEditionsWithReportsDescriptorsByEdition();
        break;
    }

    newJobHistory.endDate = new Date();
    await this.jobsRepository.save(newJobHistory);
    return {};
  }
}
