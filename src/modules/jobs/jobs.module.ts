import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ReportDescriptor } from 'src/modules/reports/model/entities/report-descriptor.entity'
import { ReportNotEvaluated } from 'src/modules/reports/model/entities/report-not-evaluated.entity'
import { ReportQuestion } from 'src/modules/reports/model/entities/report-question.entity'
import { ReportRace } from 'src/modules/reports/model/entities/report-race.entity'

import { ReportEdition } from '../reports/model/entities/report-edition.entity'
import { ReportSubject } from '../reports/model/entities/report-subject.entity'
import { ReportsModule } from '../reports/reports.module'
import { Job } from './job.entity'
import { JobsController } from './jobs.controller'
import { JobsService } from './jobs.service'
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
  ],
  controllers: [JobsController],
})
export class JobsModule {}
