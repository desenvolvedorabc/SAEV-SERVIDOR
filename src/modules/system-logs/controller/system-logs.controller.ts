import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Pagination } from 'nestjs-typeorm-paginate'
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator'
import { User } from 'src/modules/user/model/entities/user.entity'

import { PaginationParamsLogs } from '../../../helpers/params'
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard'
import { SystemLogs } from '../model/entities/system-log.entity'
import { SystemLogsService } from '../service/system-logs.service'

@ApiTags('Logs do Sistema')
@Controller('system-logs')
export class SystemLogsController {
  constructor(private readonly systemLogsService: SystemLogsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async paginate(
    @CurrentUser() user: User,
    @Query() paginationParams: PaginationParamsLogs,
  ): Promise<Pagination<SystemLogs>> {
    return this.systemLogsService.paginate(paginationParams, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.systemLogsService.findOne(id)
  }
}
