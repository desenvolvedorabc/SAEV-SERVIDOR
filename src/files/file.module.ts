import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StudentModule } from "src/student/student.module";
import { User } from "src/user/model/entities/user.entity";
import { UserModule } from "src/user/user.module";
import { FileController } from "./controller/file.controller";
import { FileEntity } from "./model/entities/file.entity";
import { ImportData } from "./model/entities/import-data.entity";
import { FileService } from "./service/file.service";

@Module({
  imports: [TypeOrmModule.forFeature([FileEntity, ImportData, User]), UserModule, StudentModule],
  providers: [FileService],
  controllers: [FileController],
})
export class FileModule {}
