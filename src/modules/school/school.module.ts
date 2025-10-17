import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AssessmentsModule } from 'src/modules/assessment/assessment.module'
import { Assessment } from 'src/modules/assessment/model/entities/assessment.entity'
import { Student } from 'src/modules/student/model/entities/student.entity'
import { User } from 'src/modules/user/model/entities/user.entity'

import { SchoolController } from './controller/school.controller'
import { School } from './model/entities/school.entity'
import { SchoolService } from './service/school.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([School, User, Assessment, Student]),
    AssessmentsModule,
  ],
  providers: [SchoolService],
  controllers: [SchoolController],
  exports: [SchoolService],
})
export class SchoolModule {}
