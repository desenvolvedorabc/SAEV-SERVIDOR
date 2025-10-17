import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { QueryIdParamDto } from 'src/modules/profile/model/dto/QueryIdParamDto'
import { RoleProfile } from 'src/shared/enums/role.enum'

import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard'
import { IArea } from '../model/interface/area.interface'
import { AreaService } from '../service/area.service'

@Controller('area')
@ApiTags('Área do Sistema')
export class AreaController {
  constructor(private areaService: AreaService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/all')
  findAll(): Promise<IArea[]> {
    return this.areaService.findAll()
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/all/:perfil')
  findByProfile(@Param('perfil') perfil: RoleProfile) {
    return this.areaService.findByProfile(perfil)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/:id')
  findOne(@Param() { id }: QueryIdParamDto) {
    return this.areaService.findOne(id)
  }
}
