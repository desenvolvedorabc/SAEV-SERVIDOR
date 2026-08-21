import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectConnection, InjectRepository } from '@nestjs/typeorm'
import { sendEmail } from 'src/helpers/sendMail'
import { Connection, Repository } from 'typeorm'

import { Assessment } from '../../assessment/model/entities/assessment.entity'
import { AssessmentCounty } from '../../assessment/model/entities/assessment-county.entity'
import { TypeAssessmentEnum } from '../../assessment/model/enum/type-assessment.enum'
import { StudentTest } from '../../release-results/model/entities/student-test.entity'
import { Job as SAEVJob } from '../job.entity'
import { JobsService } from '../jobs.service'
import { JobStatus } from '../model/enums/job-status.enum'
import { ReprocessSchoolClassService } from './reprocess-school-class.service'

interface ReprocessTarget {
  assessmentId: number
  countyId: number
  type: TypeAssessmentEnum
}

const STUCK_RUNNING_THRESHOLD_MS = 30 * 60_000 // 30 minutos

@Injectable()
export class ReprocessService {
  private readonly logger = new Logger(ReprocessService.name)

  constructor(
    @InjectConnection()
    private readonly connection: Connection,

    @InjectRepository(SAEVJob)
    private readonly jobsRepository: Repository<SAEVJob>,

    private readonly jobsService: JobsService,
    private readonly reprocessSchoolClassService: ReprocessSchoolClassService,
    private readonly configService: ConfigService,
  ) {}

  async resolveTargets(testId: number): Promise<ReprocessTarget[]> {
    const rows = await this.connection
      .getRepository(StudentTest)
      .createQueryBuilder('AT')
      .innerJoin('AT.schoolClass', 'TUR')
      .innerJoin('TUR.TUR_ESC', 'ESC')
      .innerJoin(
        'avaliacao_municipio',
        'AVM',
        'AVM.AVM_MUN_ID = ESC.ESC_MUN_ID AND AVM.AVM_TIPO = ESC.ESC_TIPO',
      )
      .innerJoin(
        'avaliacao_teste',
        'AVT',
        'AVT.AVA_ID = AVM.AVM_AVA_ID AND AVT.TES_ID = AT.ALT_TES_ID',
      )
      .where('AT.ALT_TES_ID = :testId', { testId })
      .andWhere('AVM.AVM_DT_FIM < NOW()')
      .select('AVM.AVM_AVA_ID', 'assessmentId')
      .addSelect('AVM.AVM_MUN_ID', 'countyId')
      .addSelect('AVM.AVM_TIPO', 'type')
      .distinct(true)
      .getRawMany()

    return rows.map((row) => ({
      assessmentId: Number(row.assessmentId),
      countyId: Number(row.countyId),
      type: row.type as TypeAssessmentEnum,
    }))
  }

  async executeReprocess(jobId: number): Promise<void> {
    const job = await this.jobsRepository.findOne({ where: { id: jobId } })
    if (!job) {
      this.logger.warn(`Job ${jobId} not found`)
      return
    }

    if (job.status === JobStatus.DONE) {
      this.logger.warn(`Job ${jobId} already DONE, skipping`)
      return
    }

    if (job.status === JobStatus.RUNNING) {
      const updatedAt = job.updatedAt?.getTime() ?? 0
      const ageMs = Date.now() - updatedAt
      if (ageMs < STUCK_RUNNING_THRESHOLD_MS) {
        this.logger.warn(
          `Job ${jobId} already RUNNING (age ${Math.round(ageMs / 1000)}s), skipping`,
        )
        return
      }
      this.logger.warn(
        `Job ${jobId} stuck in RUNNING for ${Math.round(ageMs / 60_000)}min; reclaiming`,
      )
    }

    job.status = JobStatus.RUNNING
    job.startDate = new Date()
    job.retryCount = (job.retryCount ?? 0) + 1
    await this.jobsRepository.save(job)

    try {
      const edition = await this.connection
        .getRepository(Assessment)
        .createQueryBuilder('Assessment')
        .select([
          'Assessment.AVA_ID',
          'Assessment.AVA_ANO',
          'Assessment.AVA_NOME',
          'AVA_AVM.AVM_ID',
          'AVA_AVM.AVM_TIPO',
          'AVM_MUN.MUN_ID',
          'AVM_MUN.stateId',
        ])
        .innerJoin('Assessment.AVA_AVM', 'AVA_AVM')
        .innerJoin('AVA_AVM.AVM_MUN', 'AVM_MUN')
        .where('Assessment.AVA_ID = :assessmentId', {
          assessmentId: job.assessmentId,
        })
        .andWhere('AVM_MUN.MUN_ID = :countyId', { countyId: job.countyId })
        .getOne()

      if (!edition) {
        throw new Error(
          `Assessment ${job.assessmentId} / county ${job.countyId} not found`,
        )
      }

      const assessmentCounty = (edition.AVA_AVM ?? []).find(
        (ac: AssessmentCounty) => ac.AVM_MUN?.MUN_ID === job.countyId,
      )
      if (!assessmentCounty) {
        throw new Error(
          `AssessmentCounty for assessment ${job.assessmentId} / county ${job.countyId} not found`,
        )
      }

      const type = assessmentCounty.AVM_TIPO

      const affectedTestIds = (job.affectedTestIds ?? [])
        .map((id) => Number(id))
        .filter((n) => Number.isFinite(n))

      // Full pipeline for all change types (including DESCRITOR):
      // report_descriptor at school-class level is rebuilt by reprocessSchoolClassService
      // via the job-subject.created event → generateReportDescriptorBySchoolClass,
      // which reads TEG_MTI live from StudentTest answers.
      await this.reprocessSchoolClassService.regenerate(
        job.assessmentId,
        job.countyId,
        type,
        affectedTestIds,
      )
      await this.jobsService.generateReportEditionsBySchool(
        job.assessmentId,
        job.countyId,
        type,
        affectedTestIds,
      )
      await this.jobsService.generateReportEditionsByMunicipalityRegional(
        job.assessmentId,
        job.countyId,
        type,
        affectedTestIds,
      )
      await this.jobsService.generateReportEditionsByCounty(
        job.assessmentId,
        job.countyId,
        type,
        affectedTestIds,
      )

      job.status = JobStatus.DONE
      job.endDate = new Date()
      job.errorMessage = null
      await this.jobsRepository.save(job)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      this.logger.error(`Reprocess job ${jobId} failed: ${message}`)

      job.status = JobStatus.FAILED
      job.errorMessage = message
      job.endDate = new Date()
      await this.jobsRepository.save(job)

      await this.notifyFailure(jobId, job, message)
    }
  }

  private async notifyFailure(
    jobId: number,
    job: SAEVJob,
    message: string,
  ): Promise<void> {
    const raw =
      this.configService.get<string>('REPROCESS_FAILURE_NOTIFICATION_EMAIL') ??
      ''
    const recipients = raw
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean)
    if (!recipients.length) return

    await Promise.all(
      recipients.map(async (to) => {
        try {
          await sendEmail(
            to,
            'Saev | Reprocesso falhou',
            `Job #${jobId} (assessment=${job.assessmentId}, county=${job.countyId}) falhou: ${message}`,
          )
        } catch (mailErr) {
          this.logger.error(
            `Failed to send failure email to ${to}: ${
              mailErr instanceof Error ? mailErr.message : String(mailErr)
            }`,
          )
        }
      }),
    )
  }
}
