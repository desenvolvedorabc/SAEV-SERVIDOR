import { Module } from "@nestjs/common";
import { SubjectService } from "./service/subject.service";
import { SubjectController } from "./controller/subject.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Subject } from "./model/entities/subject.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Subject])],
  providers: [SubjectService],
  controllers: [SubjectController],
})
export class SubjectModule {}
