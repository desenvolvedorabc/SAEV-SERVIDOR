import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { MessageTemplatesModule } from '../message-templates/message-templates.module'
import { CronTutorMessagesController } from './controllers/cron-tutor-messages.controller'
import { SendTutorMessagesController } from './controllers/send-tutor-messages.controller'
import { SendGridController } from './controllers/sendgrid.controller'
import { TutorMessagesController } from './controllers/tutor-messages.controller'
import { TwilioController } from './controllers/twilio.controller'
import { SendTutorMessage } from './entities/send-tutor-message.entity'
import { TutorMessage } from './entities/tutor-message.entity'
import { SendTutorMessagesCronJob } from './job/send-tutor-messages.job'
import { EmailService } from './services/email.service'
import { SendTutorMessagesService } from './services/send-tutor-messages.service'
import { TutorMessagesService } from './services/tutor-messages.service'
import { WhatsappService } from './services/whatsapp.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([TutorMessage, SendTutorMessage]),
    MessageTemplatesModule,
  ],
  controllers: [
    TutorMessagesController,
    SendTutorMessagesController,
    TwilioController,
    SendGridController,
    CronTutorMessagesController,
  ],
  providers: [
    TutorMessagesService,
    SendTutorMessagesService,
    SendTutorMessagesCronJob,
    WhatsappService,
    EmailService,
  ],
})
export class TutorMessagesModule {}
