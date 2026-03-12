import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { PaginationParams } from 'src/helpers/params'
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator'
import { GetSchoolId } from 'src/modules/auth/decorator/get-school-id.decorator'
import { Role } from 'src/modules/auth/decorator/role.decorator'
import { JwtAuthGuard } from 'src/modules/auth/guard/jwt-auth.guard'
import { RolesGuard } from 'src/modules/auth/guard/roles.guard'
import { User } from 'src/modules/user/model/entities/user.entity'
import { RoleProfile } from 'src/shared/enums/role.enum'

import { CreateNotificationRuleDto } from '../dto/create-notification-rule.dto'
import { UpdateNotificationRuleDto } from '../dto/update-notification-rule.dto'
import { NotificationRulesService } from '../services/notification-rules.service'

@ApiTags('Regras de Notificação Automática')
@Controller('notification-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationRulesController {
  constructor(
    private readonly notificationRulesService: NotificationRulesService,
  ) {}

  @Post('/')
  @ApiOperation({ summary: 'Criar nova regra de notificação automática' })
  @Role([RoleProfile.ESCOLA])
  async create(
    @Body() createDto: CreateNotificationRuleDto,
    @GetSchoolId() schoolId: number,
  ) {
    return await this.notificationRulesService.create(createDto, schoolId)
  }

  @Get('/')
  @ApiOperation({ summary: 'Listar regras de notificação com paginação' })
  @Role([RoleProfile.ESCOLA])
  async findAll(@Query() params: PaginationParams, @CurrentUser() user: User) {
    return await this.notificationRulesService.findAll(params, user)
  }

  @Get('/:id')
  @ApiOperation({ summary: 'Buscar regra de notificação por ID' })
  @Role([RoleProfile.ESCOLA])
  async findOne(@Param('id') id: string, @GetSchoolId() schoolId: number) {
    return await this.notificationRulesService.findOne(+id, schoolId)
  }

  @Put('/:id')
  @ApiOperation({ summary: 'Atualizar regra de notificação completa' })
  @Role([RoleProfile.ESCOLA])
  async update(
    @Param('id') id: string,
    @GetSchoolId() schoolId: number,

    @Body() updateDto: UpdateNotificationRuleDto,
  ) {
    return await this.notificationRulesService.update(+id, schoolId, updateDto)
  }

  @Patch('/:id/toggle-active')
  @ApiOperation({ summary: 'Ativar/desativar regra de notificação' })
  @Role([RoleProfile.ESCOLA])
  async toggleActive(
    @Param('id') id: string,

    @GetSchoolId() schoolId: number,
  ): Promise<void> {
    return await this.notificationRulesService.toggleActive(+id, schoolId)
  }
}
