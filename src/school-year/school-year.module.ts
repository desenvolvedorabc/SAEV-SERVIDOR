import { Module } from "@nestjs/common";
import { SchoolYearService } from "./service/school-year.service";
import { SchoolYearController } from "./controller/school-year.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SchoolYear } from "./model/entities/school-year.entity";

@Module({
  imports: [TypeOrmModule.forFeature([SchoolYear])],
  providers: [SchoolYearService],
  controllers: [SchoolYearController],
})
export class SchoolYearModule {}
