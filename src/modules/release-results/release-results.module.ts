import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Assessment } from '../assessment/model/entities/assessment.entity'
import { AssessmentCounty } from '../assessment/model/entities/assessment-county.entity'
import { School } from '../school/model/entities/school.entity'
import { Student } from '../student/model/entities/student.entity'
import { Test } from '../test/model/entities/test.entity'
import { TestTemplate } from '../test/model/entities/test-template.entity'
import { ReleaseResultsController } from './controller/release-results.controller'
import { StudentTest } from './model/entities/student-test.entity'
import { StudentTestAnswer } from './model/entities/student-test-answer.entity'
import { StudentTestAnswerHistory } from './model/entities/student-test-answer-history.entity'
import { ReleaseResultsService } from './service/release-results.service'

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([
      Assessment,
      Test,
      Student,
      StudentTest,
      StudentTestAnswer,
      TestTemplate,
      StudentTestAnswer,
      StudentTestAnswerHistory,
      AssessmentCounty,
      School,
    ]),
  ],
  providers: [ReleaseResultsService],
  controllers: [ReleaseResultsController],
  exports: [ReleaseResultsService],
})
export class ReleaseResultsModule {}
