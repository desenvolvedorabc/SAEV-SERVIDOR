import { Module } from "@nestjs/common";
import { UserService } from "./service/user.service";
import { UserController } from "./controller/user.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./model/entities/user.entity";
import { ForgetPassword } from "./model/entities/forget-password.entity";

@Module({
  imports: [TypeOrmModule.forFeature([User, ForgetPassword])],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService]
})
export class UserModule {}
