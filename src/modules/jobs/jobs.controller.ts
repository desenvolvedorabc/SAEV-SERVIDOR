import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Role } from 'src/modules/auth/decorator/role.decorator'
import { JwtAuthGuard } from 'src/modules/auth/guard/jwt-auth.guard'
import { RoleProfile } from 'src/shared/enums/role.enum'
import { Repository } from 'typeorm'

import { GoogleOidcGuard } from '../auth/guard/google-oidc.guard'
import { ReprocessStatusQueryDto } from './dto/reprocess-status-query.dto'
import { StartJobWithFiltersDto } from './dto/start-job-with-filters.dto'
import { Job as SAEVJob } from './job.entity'
import { JobType } from './job-type.enum'
import { JobsService } from './jobs.service'
import { JobStatus } from './model/enums/job-status.enum'
import { ReprocessService } from './services/reprocess.service'

@Controller('jobs')
export class JobsController {
  private readonly logger = new Logger(JobsController.name)

  constructor(
    private readonly jobsService: JobsService,

    @InjectRepository(SAEVJob)
    private readonly jobsRepository: Repository<SAEVJob>,

    private readonly reprocessService: ReprocessService,
  ) {}

  @UseGuards(GoogleOidcGuard)
  @Get('/start-job')
  startJob() {
    this.jobsService.startJob()
  }

  @UseGuards(JwtAuthGuard)
  @Role([RoleProfile.SAEV])
  @Get('/start-job-with-filters')
  startJobWithFilters(@Query() dto: StartJobWithFiltersDto) {
    this.jobsService.startJobWithFilters(dto)
  }

  @UseGuards(JwtAuthGuard)
  @Role([RoleProfile.SAEV])
  @Get('/reprocess-status')
  async reprocessStatus(@Query() dto: ReprocessStatusQueryDto) {
    const qb = this.jobsRepository
      .createQueryBuilder('Job')
      .where('Job.jobType = :type', { type: JobType.REPROCESS_ANSWER_KEY })
      .orderBy('Job.createdAt', 'DESC')
      .take(100)

    if (dto.assessmentId) {
      qb.andWhere('Job.assessmentId = :assessmentId', {
        assessmentId: dto.assessmentId,
      })
    }
    if (dto.countyId) {
      qb.andWhere('Job.countyId = :countyId', { countyId: dto.countyId })
    }

    return qb.getMany()
  }

  @UseGuards(JwtAuthGuard)
  @Role([RoleProfile.SAEV])
  @Post('/reprocess/retry/:jobId')
  async retryReprocess(@Param('jobId', ParseIntPipe) jobId: number) {
    const job = await this.jobsRepository.findOne({ where: { id: jobId } })
    if (!job) throw new NotFoundException(`Job ${jobId} not found`)
    if (job.jobType !== JobType.REPROCESS_ANSWER_KEY) {
      throw new BadRequestException(
        `Job ${jobId} is not a REPROCESS_ANSWER_KEY job`,
      )
    }
    if (job.status === JobStatus.RUNNING) {
      throw new BadRequestException(`Job ${jobId} is already RUNNING`)
    }
    job.status = JobStatus.PENDING
    await this.jobsRepository.save(job)
    this.reprocessService
      .executeReprocess(jobId)
      .catch((err) =>
        this.logger.error(`Reprocess job ${jobId} failed`, err?.stack),
      )
    return { ok: true, jobId }
  }
}
