import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { TeacherController } from './controller/teacher.controller'
import { Formation } from './model/entities/formation.entity'
import { Gender } from './model/entities/gender.entity'
import { Skin } from './model/entities/skin.entity'
import { Teacher } from './model/entities/teacher.entity'
import { TeacherService } from './service/teacher.service'

@Module({
  imports: [TypeOrmModule.forFeature([Teacher, Gender, Skin, Formation])],
  providers: [TeacherService],
  controllers: [TeacherController],
})
export class TeacherModule {}
