import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { QueryIdParamDto } from 'src/modules/profile/model/dto/QueryIdParamDto'

import { CurrentUser } from '../auth/decorator/current-user.decorator'
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard'
import { User } from '../user/model/entities/user.entity'
import { StatesService } from './states.service'

@Controller('states')
@ApiTags('Estados')
export class StatesController {
  constructor(private statesService: StatesService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  findAll(@CurrentUser() user: User) {
    return this.statesService.findAll(user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/:id')
  findOne(@Param() { id }: QueryIdParamDto) {
    return this.statesService.findOne(id)
  }
}
