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
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator'
import { QueryIdParamDto } from 'src/modules/profile/model/dto/QueryIdParamDto'
import { User } from 'src/modules/user/model/entities/user.entity'

import { PaginationParams } from '../../../helpers/params'
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard'
import { CreateSerieDto } from '../model/dto/create-serie.dto'
import { UpdateSerieDto } from '../model/dto/update-serie.dto'
import { ISerie } from '../model/interface/serie.interface'
import { SerieService } from '../service/serie.service'

@ApiTags('Série')
@Controller('serie')
export class SerieController {
  constructor(private readonly serieService: SerieService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  add(
    @CurrentUser() user: User,
    @Body() createSerieDto: CreateSerieDto,
  ): Promise<ISerie> {
    return this.serieService.add(createSerieDto, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/all')
  findAll(): Promise<ISerie[]> {
    return this.serieService.findAll()
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
      status,
      column,
      school,
      active,
    }: PaginationParams,
  ) {
    limit = Number(limit) > 100 ? 100 : limit
    return this.serieService.paginate(
      {
        page: +page,
        limit: +limit,
        route: ' ',
      },
      search,
      column,
      order,
      status,
      school,
      active,
    )
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  findOne(@Param() { id }: QueryIdParamDto) {
    return this.serieService.findOne(id)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/reports/:id')
  findOneReports(@Param() { id }: QueryIdParamDto) {
    return this.serieService.findOneReports(id)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(':id')
  update(
    @CurrentUser() user: User,
    @Param() { id }: QueryIdParamDto,
    @Body() updateSerieDto: UpdateSerieDto,
  ): Promise<ISerie> {
    return this.serieService.update(id, updateSerieDto, user)
  }
}
