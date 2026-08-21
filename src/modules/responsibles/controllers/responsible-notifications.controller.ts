import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { CurrentResponsible } from '../decorator/current-responsible.decorator'
import { FindNotificationsDto } from '../dto/find-notifications.dto'
import { JwtResponsibleAuthGuard } from '../guard/jwt-responsible-auth.guard'
import { IResponsible } from '../model/interface/responsible.interface'
import { ResponsibleNotificationsService } from '../services/responsible-notifications.service'

@Controller('responsibles')
@UseGuards(JwtResponsibleAuthGuard)
@ApiBearerAuth()
@ApiTags('Notificações do Responsável')
export class ResponsibleNotificationsController {
  constructor(
    private readonly notificationsService: ResponsibleNotificationsService,
  ) {}

  @Get('/app/notifications')
  @ApiOperation({ summary: 'Listar notificações do responsável' })
  findAll(
    @CurrentResponsible() responsible: IResponsible,
    @Query() params: FindNotificationsDto,
  ) {
    return this.notificationsService.findAll(responsible.id, params)
  }

  @Get('/app/notifications/unread-count')
  @ApiOperation({ summary: 'Contador de notificações não lidas' })
  getUnreadCount(@CurrentResponsible() responsible: IResponsible) {
    return this.notificationsService.getUnreadCount(responsible.id)
  }

  @Patch('/app/notifications/:id/read')
  @ApiOperation({ summary: 'Confirmar ciência da notificação' })
  markAsRead(
    @CurrentResponsible() responsible: IResponsible,
    @Param('id') id: number,
  ) {
    return this.notificationsService.markAsRead(id, responsible.id)
  }
}
