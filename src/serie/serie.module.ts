import { Module } from "@nestjs/common";
import { SerieService } from "./service/serie.service";
import { SerieController } from "./controller/serie.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Serie } from "./model/entities/serie.entity";
import { Assessment } from "src/assessment/model/entities/assessment.entity";
import { ReportsModule } from "src/reports/reports.module";

@Module({
  imports: [TypeOrmModule.forFeature([Serie, Assessment]), ReportsModule],
  providers: [SerieService],
  controllers: [SerieController],
})
export class SerieModule {}
