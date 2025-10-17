import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { PaginationParams } from 'src/helpers/params'
import { RolesGuard } from 'src/modules/auth/guard/roles.guard'
import { QueryIdParamDto } from 'src/modules/profile/model/dto/QueryIdParamDto'
import { User } from 'src/modules/user/model/entities/user.entity'

import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard'
import { NotificationsService } from '../service/notification.service'

@ApiTags('Notificações')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get('/')
  paginate(
    @Request() req: { user: User },
    @Query()
    paginationParams: PaginationParams,
  ) {
    return this.notificationsService.paginate(paginationParams, req.user)
  }

  @Get(':id')
  findOne(@Request() req: { user: User }, @Param() { id }: QueryIdParamDto) {
    return this.notificationsService.findOne(id, req.user)
  }
}
