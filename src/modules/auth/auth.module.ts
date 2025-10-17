import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ForgetPassword } from 'src/modules/user/model/entities/forget-password.entity'
import { User } from 'src/modules/user/model/entities/user.entity'
import { UserService } from 'src/modules/user/service/user.service'

import { StatesModule } from '../states/states.module'
import { AuthController } from './controller/auth.controller'
import { JwtAuthGuard } from './guard/jwt-auth.guard'
import { AuthService } from './service/auth.service'
import { BasicStrategy } from './strategy/basic.strategy'
import { JwtStrategy } from './strategy/jwt.strategy'

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([User, ForgetPassword]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: `${process.env.JWT_SECONDS_EXPIRE}s` },
      }),
    }),
    StatesModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    UserService,
    BasicStrategy,
  ],
  exports: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
