import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Assessment } from "src/assessment/model/entities/assessment.entity";
import { NotificationsModule } from "src/notifications/notification.module";
import { SchoolClassModule } from "src/school-class/school-class.module";
import { Student } from "src/student/model/entities/student.entity";
import { User } from "src/user/model/entities/user.entity";
import { TransferController } from "./controller/transfer.controller";
import { Transfer } from "./model/entities/transfer.entity";
import { TransferService } from "./service/transfer.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Transfer, User, Student, Assessment]),
    NotificationsModule,
    SchoolClassModule,
  ],
  providers: [TransferService],
  controllers: [TransferController],
})
export class TransferModule {}
