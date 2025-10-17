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
import { User } from 'src/modules/user/model/entities/user.entity'

import { PaginationParams } from '../../../helpers/params'
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard'
import { CreateSchoolYearDto } from '../model/dto/create-school-year.dto'
import { UpdateSchoolYearDto } from '../model/dto/update-school-year.dto'
import { SchoolYear } from '../model/entities/school-year.entity'
import { ISchoolYear } from '../model/interface/school-year.interface'
import { SchoolYearService } from '../service/school-year.service'

@ApiTags('Ano Letivo')
@Controller('school-year')
export class SchoolYearController {
  constructor(private readonly schoolYearService: SchoolYearService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  add(
    @CurrentUser() user: User,
    @Body() createSchoolYearDto: CreateSchoolYearDto,
  ): Promise<ISchoolYear> {
    return this.schoolYearService.add(createSchoolYearDto, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/all')
  findAll(): Promise<ISchoolYear[]> {
    return this.schoolYearService.findAll()
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async paginate(
    @Query() { page, limit, search, order, status, column }: PaginationParams,
  ): Promise<Pagination<SchoolYear>> {
    limit = Number(limit) > 100 ? 100 : limit
    return this.schoolYearService.paginate(
      {
        page: +page,
        limit: +limit,
        route: ' ',
      },
      search,
      column,
      order,
      status,
    )
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  findOne(@Param() { id }: QueryIdParamDto) {
    return this.schoolYearService.findOne(id)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(':id')
  update(
    @CurrentUser() user: User,
    @Param() { id }: QueryIdParamDto,
    @Body() updateSchoolYearDto: UpdateSchoolYearDto,
  ): Promise<ISchoolYear> {
    return this.schoolYearService.update(id, updateSchoolYearDto, user)
  }
}
