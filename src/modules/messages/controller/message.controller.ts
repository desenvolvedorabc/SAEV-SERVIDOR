import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { PaginationParams } from 'src/helpers/params'
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator'
import { QueryIdParamDto } from 'src/modules/profile/model/dto/QueryIdParamDto'
import { User } from 'src/modules/user/model/entities/user.entity'

import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard'
import { CreateMessageDto } from '../model/dto/create-message.dto'
import { Message } from '../model/entities/message.entity'
import { MessagesService } from '../service/message.service'

@ApiTags('Mensagens')
@Controller('messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/')
  paginate(
    @Query()
    paginationParams: PaginationParams,
    @CurrentUser() user: User,
  ) {
    return this.messagesService.paginate(paginationParams, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  findOne(@Param() { id }: QueryIdParamDto) {
    return this.messagesService.findOne(id)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  delete(@CurrentUser() user: User, @Param() { id }: QueryIdParamDto) {
    return this.messagesService.delete(id, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  create(
    @CurrentUser() user: User,
    @Body() createMessagesDto: CreateMessageDto,
  ): Promise<Message> {
    return this.messagesService.create(createMessagesDto, user)
  }
}
