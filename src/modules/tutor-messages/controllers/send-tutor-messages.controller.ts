import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from 'src/modules/auth/guard/jwt-auth.guard'

import { PaginateSendTutorMessageParamsDto } from '../dto/paginate-send-tutor-message-params.dto'
import { SendTutorMessagesService } from '../services/send-tutor-messages.service'

@Controller('send-tutor-messages')
@ApiTags('Envios de Mensagens aos tutores')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SendTutorMessagesController {
  constructor(
    private readonly sendTutorMessagesService: SendTutorMessagesService,
  ) {}

  @Get('/')
  findAll(@Query() params: PaginateSendTutorMessageParamsDto) {
    return this.sendTutorMessagesService.findAll(params)
  }
}
