import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Student } from 'src/modules/student/model/entities/student.entity'
import { TermsModule } from 'src/modules/terms/terms.module'

import { ResponsibleNotificationsController } from './controllers/responsible-notifications.controller'
import { ForgetPasswordResponsible } from './entities/forget-password-responsible.entity'
import { Responsible } from './entities/responsible.entity'
import { ResponsibleDevice } from './entities/responsible-device.entity'
import { ResponsibleNotification } from './entities/responsible-notification.entity'
import { ResponsiblesController } from './responsibles.controller'
import { ResponsiblesService } from './responsibles.service'
import { ResponsiblesAuthService } from './responsibles-auth.service'
import { ResponsibleListingService } from './services/responsible-listing.service'
import { ResponsibleNotificationsService } from './services/responsible-notifications.service'
import { JwtResponsibleStrategy } from './strategy/jwt-responsible.strategy'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Responsible,
      ForgetPasswordResponsible,
      Student,
      ResponsibleNotification,
      ResponsibleDevice,
    ]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: `${process.env.JWT_SECONDS_EXPIRE}s` },
      }),
    }),
    TermsModule,
  ],
  controllers: [ResponsiblesController, ResponsibleNotificationsController],
  providers: [
    ResponsiblesService,
    ResponsiblesAuthService,
    ResponsibleListingService,
    ResponsibleNotificationsService,
    JwtResponsibleStrategy,
  ],
  exports: [ResponsiblesService],
})
export class ResponsiblesModule {}
