import { JobType } from "./job-type.enum";

export class JobDto {
  jobType: JobType;
  assessmentId?: number;
  countyId?: number;
}
