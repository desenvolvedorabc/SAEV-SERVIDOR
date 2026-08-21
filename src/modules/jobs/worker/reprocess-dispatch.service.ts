import { Inject, Injectable, Logger } from '@nestjs/common'
import { InjectConnection, InjectRepository } from '@nestjs/typeorm'
import { Connection, EntityManager, In, Repository } from 'typeorm'

import { TestTemplate } from '../../test/model/entities/test-template.entity'
import {
  REPROCESS_DISPATCHER,
  ReprocessDispatcher,
} from '../dispatcher/reprocess-dispatcher.interface'
import { Job as SAEVJob } from '../job.entity'
import { JobType } from '../job-type.enum'
import { AnswerKeyChangeLog } from '../model/entities/answer-key-change-log.entity'
import { JobStatus } from '../model/enums/job-status.enum'
import { ReprocessStatus } from '../model/enums/reprocess-status.enum'
import { ReprocessService } from '../services/reprocess.service'

interface ReprocessTarget {
  assessmentId: number
  countyId: number
}

@Injectable()
export class ReprocessDispatchService {
  private readonly logger = new Logger(ReprocessDispatchService.name)

  constructor(
    @InjectConnection()
    private readonly connection: Connection,

    @InjectRepository(TestTemplate)
    private readonly testTemplateRepository: Repository<TestTemplate>,

    @InjectRepository(AnswerKeyChangeLog)
    private readonly changeLogRepository: Repository<AnswerKeyChangeLog>,

    private readonly reprocessService: ReprocessService,

    @Inject(REPROCESS_DISPATCHER)
    private readonly dispatcher: ReprocessDispatcher,
  ) {}

  async handle(testTemplateId: number): Promise<void> {
    const pendingLogs = await this.changeLogRepository.find({
      where: {
        testTemplateId,
        reprocessStatus: ReprocessStatus.PENDING,
      },
      select: ['id'],
    })
    const changeLogIds = pendingLogs.map((log) => log.id)

    const template = await this.testTemplateRepository.findOne({
      where: { TEG_ID: testTemplateId },
      relations: ['TEG_TES'],
    })

    if (!template?.TEG_TES?.TES_ID) {
      this.logger.warn(
        `TestTemplate ${testTemplateId} or its TEG_TES not found; marking changelogs FAILED`,
      )
      if (changeLogIds.length) {
        await this.changeLogRepository.update(
          { id: In(changeLogIds) },
          {
            reprocessStatus: ReprocessStatus.FAILED,
            errorMessage: 'TestTemplate or parent Test not found',
          },
        )
      }
      return
    }

    const testId = template.TEG_TES.TES_ID
    const targets = await this.reprocessService.resolveTargets(testId)

    if (targets.length === 0) {
      this.logger.log(
        `No closed editions with launches for test ${testId}; nothing to reprocess`,
      )
      if (changeLogIds.length) {
        await this.changeLogRepository.update(
          { id: In(changeLogIds) },
          {
            reprocessStatus: ReprocessStatus.DONE,
            dispatchedAt: new Date(),
          },
        )
      }
      return
    }

    const firstChangeLogId = changeLogIds[0] ?? null

    const jobIds = await this.connection.transaction(async (manager) => {
      const ids: number[] = []
      for (const target of targets) {
        const jobId = await this.upsertJobLocked(
          manager,
          target,
          testId,
          firstChangeLogId,
        )
        ids.push(jobId)
      }

      if (changeLogIds.length) {
        await manager.update(
          AnswerKeyChangeLog,
          { id: In(changeLogIds) },
          {
            reprocessStatus: ReprocessStatus.DISPATCHED,
            dispatchedAt: new Date(),
          },
        )
      }
      return ids
    })

    const scheduleResults = await Promise.allSettled(
      jobIds.map((jobId) => this.dispatcher.scheduleExecute(jobId)),
    )
    scheduleResults.forEach((result, idx) => {
      if (result.status === 'rejected') {
        this.logger.error(
          `scheduleExecute failed for job ${jobIds[idx]}: ${
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason)
          }`,
        )
      }
    })
  }

  private async upsertJobLocked(
    manager: EntityManager,
    target: ReprocessTarget,
    testId: number,
    firstChangeLogId: number | null,
  ): Promise<number> {
    const jobRepo = manager.getRepository(SAEVJob)

    // SELECT ... FOR UPDATE: bloqueia a "linha lógica" durante a transação.
    // Como pode não haver linha ainda, o lock real é por (assessmentId, countyId)
    // — a presença do índice composto IDX_job_assessment_county torna isso eficiente.
    const existing = await jobRepo
      .createQueryBuilder('job')
      .setLock('pessimistic_write')
      .where('job.jobType = :type', { type: JobType.REPROCESS_ANSWER_KEY })
      .andWhere('job.assessmentId = :assessmentId', {
        assessmentId: target.assessmentId,
      })
      .andWhere('job.countyId = :countyId', { countyId: target.countyId })
      .andWhere('job.status NOT IN (:...done)', {
        done: [JobStatus.DONE, JobStatus.FAILED],
      })
      .getOne()

    if (existing) {
      const mergedIds = this.mergeTestIds(existing.affectedTestIds, testId)
      if (mergedIds.length !== (existing.affectedTestIds ?? []).length) {
        existing.affectedTestIds = mergedIds
        await jobRepo.save(existing)
      }
      return existing.id
    }

    const job = jobRepo.create({
      bullId: '',
      jobType: JobType.REPROCESS_ANSWER_KEY,
      assessmentId: target.assessmentId,
      countyId: target.countyId,
      startDate: new Date(),
      endDate: new Date(),
      status: JobStatus.PENDING,
      triggeredByChangeLogId: firstChangeLogId,
      affectedTestIds: [String(testId)],
    })
    const saved = await jobRepo.save(job)
    return saved.id
  }

  private mergeTestIds(
    existing: string[] | null | undefined,
    testId: number,
  ): string[] {
    const set = new Set<string>(existing ?? [])
    set.add(String(testId))
    return Array.from(set)
  }
}
