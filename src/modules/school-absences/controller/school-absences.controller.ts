import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Pagination } from 'nestjs-typeorm-paginate'
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator'
import { User } from 'src/modules/user/model/entities/user.entity'

import { PaginationParams } from '../../../helpers/params'
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard'
import { CreateSchoolAbsencesDto } from '../model/dto/create-school-absences.dto'
import { SchoolAbsencesService } from '../service/school-absences.service'

@ApiTags('Infrequência')
@Controller('school-absences')
export class SchoolAbsencesController {
  constructor(private readonly schoolAbsencesService: SchoolAbsencesService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  save(
    @CurrentUser() user: User,
    @Body() createSchoolAbsencesDto: CreateSchoolAbsencesDto[],
  ) {
    return this.schoolAbsencesService.save(createSchoolAbsencesDto, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete()
  remove(@Body() createSchoolAbsencesDto: CreateSchoolAbsencesDto[]) {
    return this.schoolAbsencesService.delete(createSchoolAbsencesDto)
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
      schoolClass,
      month,
      year,
    }: PaginationParams,
  ): Promise<Pagination<any>> {
    limit = Number(limit) > 100 ? 100 : limit
    return this.schoolAbsencesService.paginate(
      {
        page: +page,
        limit: +limit,
        route: ' ',
      },
      search,
      column,
      order,
      schoolClass,
      month,
      year,
    )
  }
}
