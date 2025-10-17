import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { SchoolYearController } from './controller/school-year.controller'
import { SchoolYear } from './model/entities/school-year.entity'
import { SchoolYearService } from './service/school-year.service'

@Module({
  imports: [TypeOrmModule.forFeature([SchoolYear])],
  providers: [SchoolYearService],
  controllers: [SchoolYearController],
})
export class SchoolYearModule {}
