import { Module } from "@nestjs/common";
import { StudentService } from "./service/student.service";
import { StudentController } from "./controller/student.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Student } from "./model/entities/student.entity";
import { Pcd } from "src/shared/model/entities/pcd.entity";
import { Assessment } from "src/assessment/model/entities/assessment.entity";
import { SchoolClassModule } from "src/school-class/school-class.module";
import { SchoolClassStudent } from "src/school-class/model/entities/school-class-student.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Student, Pcd, Assessment, SchoolClassStudent]),
    SchoolClassModule,
  ],
  providers: [StudentService],
  controllers: [StudentController],
  exports: [StudentService]
})
export class StudentModule {}
