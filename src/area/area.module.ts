import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AreaController } from "./controller/area.controller";
import { Area } from "./model/entities/area.entity";
import { AreaService } from "./service/area.service";

@Module({
  imports: [TypeOrmModule.forFeature([Area])],
  providers: [AreaService],
  controllers: [AreaController],
})
export class AreaModule {}
