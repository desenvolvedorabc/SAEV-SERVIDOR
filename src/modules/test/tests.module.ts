import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JobsModule } from 'src/modules/jobs/jobs.module'
import { AnswerKeyChangeLog } from 'src/modules/jobs/model/entities/answer-key-change-log.entity'
import { StudentTestAnswer } from 'src/modules/release-results/model/entities/student-test-answer.entity'
import { Serie } from 'src/modules/serie/model/entities/serie.entity'
import { Student } from 'src/modules/student/model/entities/student.entity'
import { Subject } from 'src/modules/subject/model/entities/subject.entity'

import { TestsController } from './controller/tests.controller'
import { Test } from './model/entities/test.entity'
import { TestTemplate } from './model/entities/test-template.entity'
import { TestsService } from './service/tests.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Test,
      TestTemplate,
      Serie,
      Subject,
      Student,
      StudentTestAnswer,
      AnswerKeyChangeLog,
    ]),
    forwardRef(() => JobsModule),
  ],
  providers: [TestsService],
  controllers: [TestsController],
  exports: [TypeOrmModule],
})
export class TestsModule {}
