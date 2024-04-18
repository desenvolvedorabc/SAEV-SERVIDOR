import { Module } from "@nestjs/common";
import { SchoolService } from "./service/school.service";
import { SchoolController } from "./controller/school.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { School } from "./model/entities/school.entity";
import { User } from "src/user/model/entities/user.entity";
import { Assessment } from "src/assessment/model/entities/assessment.entity";
import { AssessmentsModule } from "src/assessment/assessment.module";
import { Student } from "src/student/model/entities/student.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([School, User, Assessment, Student]),
    AssessmentsModule,
  ],
  providers: [SchoolService],
  controllers: [SchoolController],
  exports: [SchoolService]
})
export class SchoolModule {}
