import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
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
    ]),
  ],
  providers: [TestsService],
  controllers: [TestsController],
})
export class TestsModule {}
