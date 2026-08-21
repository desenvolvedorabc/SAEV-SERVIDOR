import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ReportDescriptor } from 'src/modules/reports/model/entities/report-descriptor.entity'
import { ReportNotEvaluated } from 'src/modules/reports/model/entities/report-not-evaluated.entity'
import { ReportQuestion } from 'src/modules/reports/model/entities/report-question.entity'
import { ReportRace } from 'src/modules/reports/model/entities/report-race.entity'
import { TestTemplate } from 'src/modules/test/model/entities/test-template.entity'

import { ReportEdition } from '../reports/model/entities/report-edition.entity'
import { ReportSubject } from '../reports/model/entities/report-subject.entity'
import { ReportsModule } from '../reports/reports.module'
import { CloudTasksReprocessDispatcher } from './dispatcher/cloud-tasks-reprocess-dispatcher'
import { InProcessReprocessDispatcher } from './dispatcher/in-process-reprocess-dispatcher'
import { REPROCESS_DISPATCHER } from './dispatcher/reprocess-dispatcher.interface'
import { Job } from './job.entity'
import { JobsController } from './jobs.controller'
import { JobsService } from './jobs.service'
import { AnswerKeyChangeLog } from './model/entities/answer-key-change-log.entity'
import { JobDescriptorsService } from './services/job-descriptor.service'
import { JobNotEvaluatedService } from './services/job-not-evaluated.service'
import { JobQuestionService } from './services/job-question.service'
import { JobRaceService } from './services/job-race.service'
import { JobSubjectService } from './services/job-subject.service'
import { JobDescriptorsRepository } from './services/repositories/job-descriptor.repository'
import { JobNotEvaluatedRepository } from './services/repositories/job-not-evaluated.repository'
import { JobQuestionRepository } from './services/repositories/job-question.repository'
import { JobRaceRepository } from './services/repositories/job-race.repository'
import { JobSubjectRepository } from './services/repositories/job-subject.repository'
import { ReprocessService } from './services/reprocess.service'
import { ReprocessReconciliationService } from './services/reprocess-reconciliation.service'
import { ReprocessSchoolClassService } from './services/reprocess-school-class.service'
import { ReprocessDispatchService } from './worker/reprocess-dispatch.service'

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
      Job,
      AnswerKeyChangeLog,
      TestTemplate,
    ]),
  ],
  providers: [
    JobsService,
    JobNotEvaluatedService,
    JobRaceService,
    JobRaceRepository,
    JobQuestionRepository,
    JobDescriptorsService,
    JobQuestionService,
    JobSubjectService,
    JobSubjectRepository,
    JobDescriptorsRepository,
    JobNotEvaluatedRepository,
    ReprocessService,
    ReprocessSchoolClassService,
    ReprocessDispatchService,
    ReprocessReconciliationService,
    InProcessReprocessDispatcher,
    {
      provide: REPROCESS_DISPATCHER,
      inject: [ConfigService, InProcessReprocessDispatcher],
      useFactory: (
        config: ConfigService,
        inProcess: InProcessReprocessDispatcher,
      ) => {
        const mode = config.get<string>('REPROCESS_DISPATCHER') ?? 'in-process'
        if (mode === 'cloud-tasks') {
          return new CloudTasksReprocessDispatcher(config)
        }
        return inProcess
      },
    },
  ],
  controllers: [JobsController],
  exports: [
    REPROCESS_DISPATCHER,
    ReprocessService,
    ReprocessDispatchService,
    ReprocessReconciliationService,
    TypeOrmModule,
  ],
})
export class JobsModule {}
