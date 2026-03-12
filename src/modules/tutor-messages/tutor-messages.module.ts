import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { MessageTemplatesModule } from '../message-templates/message-templates.module'
import { TwilioModule } from '../twilio/twilio.module'
import { CronTutorMessagesController } from './controllers/cron-tutor-messages.controller'
import { SendTutorMessagesController } from './controllers/send-tutor-messages.controller'
import { TutorMessagesController } from './controllers/tutor-messages.controller'
import { SendTutorMessage } from './entities/send-tutor-message.entity'
import { TutorMessage } from './entities/tutor-message.entity'
import { SendTutorMessagesCronJob } from './job/send-tutor-messages.job'
import { SendTutorMessagesService } from './services/send-tutor-messages.service'
import { TutorMessagesService } from './services/tutor-messages.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([TutorMessage, SendTutorMessage]),
    MessageTemplatesModule,
    forwardRef(() => TwilioModule),
  ],
  controllers: [
    TutorMessagesController,
    SendTutorMessagesController,
    CronTutorMessagesController,
  ],
  providers: [
    TutorMessagesService,
    SendTutorMessagesService,
    SendTutorMessagesCronJob,
  ],
  exports: [SendTutorMessagesService],
})
export class TutorMessagesModule {}
