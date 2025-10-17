import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ReleaseResultsModule } from 'src/modules/release-results/release-results.module'
import { StudentModule } from 'src/modules/student/student.module'
import { User } from 'src/modules/user/model/entities/user.entity'
import { UserModule } from 'src/modules/user/user.module'

import { FileController } from './controller/file.controller'
import { FileEntity } from './model/entities/file.entity'
import { ImportData } from './model/entities/import-data.entity'
import { FileService } from './service/file.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([FileEntity, ImportData, User]),
    UserModule,
    StudentModule,
    ReleaseResultsModule,
  ],
  providers: [FileService],
  controllers: [FileController],
})
export class FileModule {}
