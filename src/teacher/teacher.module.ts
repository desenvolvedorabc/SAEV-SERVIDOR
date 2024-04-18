import { Module } from "@nestjs/common";
import { TeacherService } from "./service/teacher.service";
import { TeacherController } from "./controller/teacher.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Teacher } from "./model/entities/teacher.entity";
import { Gender } from "./model/entities/gender.entity";
import { Skin } from "./model/entities/skin.entity";
import { Formation } from "./model/entities/formation.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Teacher, Gender, Skin, Formation])],
  providers: [TeacherService],
  controllers: [TeacherController],
})
export class TeacherModule {}
