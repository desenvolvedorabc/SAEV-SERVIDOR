import { Module } from "@nestjs/common";
import { CountiesService } from "./service/counties.service";
import { CountiesController } from "./controller/counties.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { County } from "./model/entities/county.entity";
import { User } from "src/user/model/entities/user.entity";
import { Assessment } from "src/assessment/model/entities/assessment.entity";
import { AssessmentsModule } from "src/assessment/assessment.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([County, User, Assessment]),
    AssessmentsModule,
  ],
  providers: [CountiesService],
  controllers: [CountiesController],
  exports: [CountiesService]
})
export class CountiesModule {}
