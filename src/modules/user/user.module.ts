import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { StatesModule } from '../states/states.module'
import { UserController } from './controller/user.controller'
import { ForgetPassword } from './model/entities/forget-password.entity'
import { User } from './model/entities/user.entity'
import { UserService } from './service/user.service'

@Module({
  imports: [TypeOrmModule.forFeature([User, ForgetPassword]), StatesModule],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
