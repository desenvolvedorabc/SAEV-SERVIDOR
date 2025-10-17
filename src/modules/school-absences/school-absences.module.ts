import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Student } from 'src/modules/student/model/entities/student.entity'
import { StudentModule } from 'src/modules/student/student.module'

import { SchoolAbsencesController } from './controller/school-absences.controller'
import { SchoolAbsence } from './model/entities/school-absences.entity'
import { SchoolAbsencesService } from './service/school-absences.service'

@Module({
  imports: [TypeOrmModule.forFeature([SchoolAbsence, Student]), StudentModule],
  providers: [SchoolAbsencesService],
  controllers: [SchoolAbsencesController],
})
export class SchoolAbsencesModule {}
