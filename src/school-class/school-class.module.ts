import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SchoolClassController } from "./controller/school-class.controller";
import { SchoolClass } from "./model/entities/school-class.entity";
import { SchoolClassService } from "./service/school-class.service";
import { SchoolClassStudent } from "./model/entities/school-class-student.entity";
import { Student } from "src/student/model/entities/student.entity";

@Module({
  imports: [TypeOrmModule.forFeature([SchoolClass, SchoolClassStudent, Student])],
  providers: [SchoolClassService],
  controllers: [SchoolClassController],
  exports: [SchoolClassService],
})
export class SchoolClassModule {}
