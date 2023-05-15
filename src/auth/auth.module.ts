import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { JwtAuthGuard } from "./guard/jwt-auth.guard";
import { JwtStrategy } from "./strategy/jwt.strategy";
import { AuthService } from "./service/auth.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthController } from "./controller/auth.controller";
import { User } from "src/user/model/entities/user.entity";
import { UserService } from "src/user/service/user.service";
import { ForgetPassword } from "src/user/model/entities/forget-password.entity";
import { PassportModule } from "@nestjs/passport";
import { BasicStrategy } from "./strategy/basic.strategy";

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([User, ForgetPassword]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get("JWT_SECRET"),
        signOptions: { expiresIn: `${process.env.JWT_SECONDS_EXPIRE}s` },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, UserService, BasicStrategy],
  exports: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
