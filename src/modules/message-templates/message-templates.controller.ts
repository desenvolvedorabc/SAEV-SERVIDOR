import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { PaginationParams } from 'src/helpers/params'
import { RoleProfile } from 'src/shared/enums/role.enum'

import { CurrentUser } from '../auth/decorator/current-user.decorator'
import { GetSchoolId } from '../auth/decorator/get-school-id.decorator'
import { Role } from '../auth/decorator/role.decorator'
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard'
import { RolesGuard } from '../auth/guard/roles.guard'
import { User } from '../user/model/entities/user.entity'
import { CreateMessageTemplateDto } from './dto/create-message-template.dto'
import { UpdateMessageTemplateDto } from './dto/update-message-template.dto'
import { MessageTemplatesService } from './message-templates.service'

@Controller('message-templates')
@ApiTags('Templates de Mensagens')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MessageTemplatesController {
  constructor(
    private readonly messageTemplatesService: MessageTemplatesService,
  ) {}

  @Post('/')
  @Role([RoleProfile.ESCOLA])
  create(
    @Body() createMessageTemplateDto: CreateMessageTemplateDto,
    @GetSchoolId() schoolId: number,
  ): Promise<void> {
    return this.messageTemplatesService.create(
      createMessageTemplateDto,
      schoolId,
    )
  }

  @Get('/')
  findAll(@Query() params: PaginationParams, @CurrentUser() user: User) {
    return this.messageTemplatesService.findAll(params, user)
  }

  @Get('/:id')
  findOne(@Param('id') id: string) {
    return this.messageTemplatesService.findOne(+id)
  }

  @Patch('/:id')
  @Role([RoleProfile.ESCOLA])
  update(
    @Param('id') id: string,
    @Body() updateMessageTemplateDto: UpdateMessageTemplateDto,
    @GetSchoolId() schoolId: number,
  ): Promise<void> {
    return this.messageTemplatesService.update(
      +id,
      updateMessageTemplateDto,
      schoolId,
    )
  }

  @Delete('/:id')
  @Role([RoleProfile.ESCOLA])
  remove(
    @Param('id') id: string,
    @GetSchoolId() schoolId: number,
  ): Promise<void> {
    return this.messageTemplatesService.remove(+id, schoolId)
  }
}
