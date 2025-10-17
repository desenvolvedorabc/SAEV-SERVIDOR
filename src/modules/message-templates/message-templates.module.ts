import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { MessageTemplate } from './entities/message-template.entity'
import { MessageTemplatesController } from './message-templates.controller'
import { MessageTemplatesService } from './message-templates.service'

@Module({
  imports: [TypeOrmModule.forFeature([MessageTemplate])],
  controllers: [MessageTemplatesController],
  providers: [MessageTemplatesService],
  exports: [MessageTemplatesService],
})
export class MessageTemplatesModule {}
