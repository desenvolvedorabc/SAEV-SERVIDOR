import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AutomaticNotificationsModule } from '../automatic-notifications/automatic-notifications.module'
import { Student } from '../student/model/entities/student.entity'
import { TutorMessagesModule } from '../tutor-messages/tutor-messages.module'
import { SendGridController } from './controllers/sendgrid.controller'
import { TwilioController } from './controllers/twilio.controller'
import { WhatsAppConversationWindow } from './entities/whatsapp-conversation-window.entity'
import { ConversationWindowService } from './services/conversation-window.service'
import { EmailService } from './services/email.service'
import { WhatsappService } from './services/whatsapp.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([WhatsAppConversationWindow, Student]),
    forwardRef(() => TutorMessagesModule),
    forwardRef(() => AutomaticNotificationsModule),
  ],
  controllers: [TwilioController, SendGridController],
  providers: [WhatsappService, EmailService, ConversationWindowService],
  exports: [EmailService, WhatsappService, ConversationWindowService],
})
export class TwilioModule {}
