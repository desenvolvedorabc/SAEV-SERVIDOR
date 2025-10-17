import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Assessment } from 'src/modules/assessment/model/entities/assessment.entity'
import { SchoolClassStudent } from 'src/modules/school-class/model/entities/school-class-student.entity'
import { SchoolClassModule } from 'src/modules/school-class/school-class.module'
import { Pcd } from 'src/shared/model/entities/pcd.entity'

import { StudentController } from './controller/student.controller'
import { Student } from './model/entities/student.entity'
import { StudentService } from './service/student.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([Student, Pcd, Assessment, SchoolClassStudent]),
    SchoolClassModule,
  ],
  providers: [StudentService],
  controllers: [StudentController],
  exports: [StudentService],
})
export class StudentModule {}
