import { DynamicModule, Module, Type } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ResponsibleDevice } from 'src/modules/responsibles/entities/responsible-device.entity'

import { PushNotificationService } from './push-notification.service'

export interface PushNotificationModuleOptions {
  useClass: Type<PushNotificationService>
}

@Module({})
export class PushNotificationModule {
  static forRoot(options: PushNotificationModuleOptions): DynamicModule {
    return {
      module: PushNotificationModule,
      imports: [TypeOrmModule.forFeature([ResponsibleDevice])],
      providers: [
        {
          provide: PushNotificationService,
          useClass: options.useClass,
        },
      ],
      exports: [PushNotificationService],
      global: true,
    }
  }
}
