import { Module } from "@nestjs/common";
import { SchoolAbsencesService } from "./service/school-absences.service";
import { SchoolAbsencesController } from "./controller/school-absences.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SchoolAbsence } from "./model/entities/school-absences.entity";
import { Student } from "src/student/model/entities/student.entity";
import { StudentModule } from "src/student/student.module";

@Module({
  imports: [TypeOrmModule.forFeature([SchoolAbsence, Student]), StudentModule],
  providers: [SchoolAbsencesService],
  controllers: [SchoolAbsencesController],
})
export class SchoolAbsencesModule {}
