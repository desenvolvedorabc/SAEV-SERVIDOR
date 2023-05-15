import { Module } from "@nestjs/common";
import { TestsService } from "./service/tests.service";
import { TestsController } from "./controller/tests.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Test } from "./model/entities/test.entity";
import { TestTemplate } from "./model/entities/test-template.entity";
import { Serie } from "src/serie/model/entities/serie.entity";
import { Subject } from "src/subject/model/entities/subject.entity";
import { Student } from "src/student/model/entities/student.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Test, TestTemplate, Serie, Subject, Student])],
  providers: [TestsService],
  controllers: [TestsController],
})
export class TestsModule {}
