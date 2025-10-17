import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Pagination } from 'nestjs-typeorm-paginate'
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator'
import { QueryIdParamDto } from 'src/modules/profile/model/dto/QueryIdParamDto'
import { ISerie } from 'src/modules/serie/model/interface/serie.interface'
import { User } from 'src/modules/user/model/entities/user.entity'

import { PaginationParams } from '../../../helpers/params'
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard'
import { ISubject } from '../../subject/model/interface/subject.interface'
import { CreateHeadquarterDto } from '../model/dto/create-headquarter.dto'
import { UpdateHeadquarterDto } from '../model/dto/update-headquarter.dto'
import { Headquarter } from '../model/entities/headquarter.entity'
import { IHeadquarter } from '../model/interface/headquarter.interface'
import { HeadquartersService } from '../service/headquarters.service'

@ApiTags('Matriz de Referência')
@Controller('headquarters')
export class HeadquartersController {
  constructor(private readonly headquartersService: HeadquartersService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  add(
    @CurrentUser() user: User,
    @Body() createHeadquarterDto: CreateHeadquarterDto,
  ): Promise<IHeadquarter> {
    return this.headquartersService.add(createHeadquarterDto, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/all')
  findAll(): Promise<IHeadquarter[]> {
    return this.headquartersService.findAll()
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async paginate(
    @Query()
    {
      page,
      limit,
      search,
      order,
      column,
      subject,
      serie,
      active,
    }: PaginationParams,
  ): Promise<Pagination<Headquarter>> {
    limit = Number(limit) > 100 ? 100 : limit
    return this.headquartersService.paginate(
      {
        page: +page,
        limit: +limit,
        route: ' ',
      },
      search,
      column,
      order,
      subject,
      serie,
      active,
    )
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  async findOne(@Param() { id }: QueryIdParamDto) {
    return this.headquartersService.findOne(id)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(':id')
  update(
    @CurrentUser() user: User,
    @Param() { id }: QueryIdParamDto,
    @Body() updateHeadquarterDto: UpdateHeadquarterDto,
  ): Promise<IHeadquarter> {
    return this.headquartersService.update(id, updateHeadquarterDto, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('subjects/all')
  findSubjectsAll(): Promise<ISubject[]> {
    return this.headquartersService.findSubjectsAll()
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('series/all')
  findSeriesAll(): Promise<ISerie[]> {
    return this.headquartersService.findSeriesAll()
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put('/descritor/:id/toggle-active')
  toggleActive(@Param() { id }: QueryIdParamDto): Promise<{
    active: boolean
  }> {
    return this.headquartersService.toggleActiveDescriptor(id)
  }
}
