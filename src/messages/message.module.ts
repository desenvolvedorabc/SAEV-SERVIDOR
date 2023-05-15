import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { County } from "src/counties/model/entities/county.entity";
import { NotificationsModule } from "src/notifications/notification.module";
import { School } from "src/school/model/entities/school.entity";
import { MessagesController } from "./controller/message.controller";
import { Message } from "./model/entities/message.entity";
import { MessagesService } from "./service/message.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, County, School]),
    NotificationsModule,
  ],
  providers: [MessagesService],
  controllers: [MessagesController],
})
export class MessagesModule {}
