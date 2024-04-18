import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Assessment } from "src/assessment/model/entities/assessment.entity";
import { Student } from "src/student/model/entities/student.entity";
import { TestTemplate } from "src/test/model/entities/test-template.entity";
import { Test } from "src/test/model/entities/test.entity";
import { ReleaseResultsController } from "./controller/release-results.controller";
import { StudentTestAnswer } from "./model/entities/student-test-answer.entity";
import { StudentTest } from "./model/entities/student-test.entity";
import { ReleaseResultsService } from "./service/release-results.service";

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
    ]),
  ],
  providers: [ReleaseResultsService],
  controllers: [ReleaseResultsController],
  exports: [ReleaseResultsService],
})
export class ReleaseResultsModule {}
