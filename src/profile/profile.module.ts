import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Area } from "src/area/model/entities/area.entity";
import { ProfileController } from "./controller/profile.controller";
import { ProfileBase } from "./model/entities/profile-base.entity";
import { SubProfile } from "./model/entities/sub-profile.entity";
import { ProfileService } from "./service/profile.service";

@Module({
  imports: [TypeOrmModule.forFeature([SubProfile, ProfileBase, Area])],
  providers: [ProfileService],
  controllers: [ProfileController],
})
export class ProfileModule {}
