import { Controller, Get, Query } from '@nestjs/common'

import { StartJobWithFiltersDto } from './dto/start-job-with-filters.dto'
import { JobsService } from './jobs.service'

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get('/start-job')
  startJob() {
    this.jobsService.startJob()
  }

  @Get('/start-job-with-filters')
  startJobWithFilters(@Query() dto: StartJobWithFiltersDto) {
    this.jobsService.startJobWithFilters(dto)
  }
}
