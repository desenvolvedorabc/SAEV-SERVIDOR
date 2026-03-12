import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator'
import { Role } from 'src/modules/auth/decorator/role.decorator'
import { JwtAuthGuard } from 'src/modules/auth/guard/jwt-auth.guard'
import { RolesGuard } from 'src/modules/auth/guard/roles.guard'
import { User } from 'src/modules/user/model/entities/user.entity'
import { RoleProfile } from 'src/shared/enums/role.enum'

import { PaginationAutomaticNotificationsParamsDto } from '../dto/pagination-automatic-notifications-params.dto'
import { AutomaticNotificationsService } from '../services/automatic-notifications.service'

@ApiTags('Notificação Automática')
@Controller('automatic-notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AutomaticNotificationsController {
  constructor(
    private readonly automaticNotificationsService: AutomaticNotificationsService,
  ) {}

  @Get('/')
  // @Role([RoleProfile.ESCOLA])
  findAll(
    @Query() params: PaginationAutomaticNotificationsParamsDto,
    @CurrentUser() user: User,
  ) {
    return this.automaticNotificationsService.findAll(params, user)
  }
}
