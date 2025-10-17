import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Response } from 'express'
import { QueryIdParamDto } from 'src/modules/profile/model/dto/QueryIdParamDto'

import { CurrentUser } from '../auth/decorator/current-user.decorator'
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard'
import { User } from '../user/model/entities/user.entity'
import { CreateMunicipalRegionalDto } from './model/dto/create-municipal-regional.dto'
import { CreateSingleRegionalDto } from './model/dto/create-single-regional.dto'
import { CreateStateRegionalDto } from './model/dto/create-state-regional.dto'
import { PaginateParamsRegional } from './model/dto/pagination-params-regional.dto'
import { UpdateMunicipalRegionalDto } from './model/dto/update-municipal-regional.dto'
import { UpdateSingleRegionalDto } from './model/dto/update-single-regional.dto'
import { UpdateStateRegionalDto } from './model/dto/update-state-regional.dto'
import { RegionalService } from './regional.service'
import { MunicipalRegionalService } from './services/municipal-regional.service'
import { SingleRegionalService } from './services/single-regional.service'
import { StateRegionalService } from './services/state-regional.service'

@Controller('regional')
@ApiTags('Regionais')
export class RegionalController {
  constructor(
    private regionalService: RegionalService,
    private stateRegionalService: StateRegionalService,
    private municipalRegionalService: MunicipalRegionalService,
    private singleRegionalService: SingleRegionalService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('/state')
  createStateRegional(
    @Body() dto: CreateStateRegionalDto,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.stateRegionalService.create(dto, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('/municipal')
  createMunicipalRegional(
    @Body() dto: CreateMunicipalRegionalDto,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.municipalRegionalService.create(dto, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('/single')
  createSingleRegional(
    @Body() dto: CreateSingleRegionalDto,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.singleRegionalService.create(dto, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async paginate(
    @Query() params: PaginateParamsRegional,
    @CurrentUser() user: User,
  ) {
    return this.regionalService.findAll(params, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/by-filter')
  async paginateByFilter(
    @Query() params: PaginateParamsRegional,
    @CurrentUser() user: User,
  ) {
    return this.regionalService.findAllForFilter(params, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put('/state/:id')
  updateStateRegional(
    @Param() { id }: QueryIdParamDto,
    @Body() dto: UpdateStateRegionalDto,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.stateRegionalService.update(id, dto, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put('/municipal/:id')
  updateMunicipalRegional(
    @Param() { id }: QueryIdParamDto,
    @Body() dto: UpdateMunicipalRegionalDto,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.municipalRegionalService.update(id, dto, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put('/single/:id')
  updateSingleRegional(
    @Param() { id }: QueryIdParamDto,
    @Body() dto: UpdateSingleRegionalDto,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.singleRegionalService.update(id, dto, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/csv')
  async generateCsvForSynthetic(
    @Query()
    params: PaginateParamsRegional,
    @Res() response: Response,
    @CurrentUser() user: User,
  ) {
    const data = await this.regionalService.generateCsv(params, user)

    response.setHeader('Content-Type', 'text/csv')
    response.header('Content-disposition', 'attachment; filename=regionais.csv')
    return response.status(200).send('\ufeff' + data)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/:id')
  findOne(@Param() { id }: QueryIdParamDto) {
    return this.regionalService.findOne(id)
  }
}
