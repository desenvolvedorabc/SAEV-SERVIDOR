import { Module } from "@nestjs/common";
import { HeadquartersService } from "./service/headquarters.service";
import { HeadquartersController } from "./controller/headquarters.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Headquarter } from "./model/entities/headquarter.entity";
import { HeadquarterTopic } from "./model/entities/headquarter-topic.entity";
import { HeadquarterTopicItem } from "./model/entities/headquarter-topic-item.entity";
import { Serie } from "src/serie/model/entities/serie.entity";
import { Subject } from "src/subject/model/entities/subject.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Headquarter,
      HeadquarterTopic,
      HeadquarterTopicItem,
      Serie,
      Subject,
    ]),
  ],
  providers: [HeadquartersService],
  controllers: [HeadquartersController],
})
export class HeadquartersModule {}
