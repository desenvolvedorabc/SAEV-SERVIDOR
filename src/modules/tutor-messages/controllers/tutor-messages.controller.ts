import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { PaginationParams } from 'src/helpers/params'
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator'
import { Role } from 'src/modules/auth/decorator/role.decorator'
import { JwtAuthGuard } from 'src/modules/auth/guard/jwt-auth.guard'
import { RolesGuard } from 'src/modules/auth/guard/roles.guard'
import { User } from 'src/modules/user/model/entities/user.entity'
import { RoleProfile } from 'src/shared/enums/role.enum'

import { CreateTutorMessageDto } from '../dto/create-tutor-message.dto'
import { TutorMessagesService } from '../services/tutor-messages.service'

@Controller('tutor-messages')
@ApiTags('Mensagens aos tutores')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TutorMessagesController {
  constructor(private readonly tutorMessagesService: TutorMessagesService) {}

  @Post('/')
  @Role([RoleProfile.ESCOLA])
  create(@Body() createTutorMessageDto: CreateTutorMessageDto) {
    return this.tutorMessagesService.create(createTutorMessageDto)
  }

  @Get('/')
  findAll(@Query() params: PaginationParams, @CurrentUser() user: User) {
    return this.tutorMessagesService.findAll(params, user)
  }

  @Get('/:id')
  findOne(@Param('id') id: string) {
    return this.tutorMessagesService.findOne(+id)
  }
}
