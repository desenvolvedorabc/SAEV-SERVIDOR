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
import { PaginationParams } from 'src/helpers/params'
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator'
import { QueryIdParamDto } from 'src/modules/profile/model/dto/QueryIdParamDto'
import { User } from 'src/modules/user/model/entities/user.entity'

import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard'
import { CreateSchoolClassDto } from '../model/dto/create-school-class.dto'
import { UpdateSchoolClassDto } from '../model/dto/update-school-class.dto'
import { SchoolClass } from '../model/entities/school-class.entity'
import { SchoolClassService } from '../service/school-class.service'

@ApiTags('Turmas')
@Controller('school-class')
export class SchoolClassController {
  constructor(private schoolClassService: SchoolClassService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async paginate(
    @CurrentUser() user: User,
    @Query()
    params: PaginationParams,
  ): Promise<any> {
    return this.schoolClassService.paginate(params, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/transfer')
  async paginateTransfer(
    @CurrentUser() user: User,
    @Query()
    params: PaginationParams,
  ): Promise<any> {
    return this.schoolClassService.paginateTransfer(params, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/all')
  findAll(): Promise<SchoolClass[]> {
    return this.schoolClassService.findAll()
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  findOne(@Param() { id }: QueryIdParamDto) {
    return this.schoolClassService.findOne(id)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/school/:idSchool')
  findSerieBySchool(@Param('idSchool') idSchool: string) {
    return this.schoolClassService.findSerieBySchool(idSchool)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/school/:idSchool/serie/:idSerie')
  findBySchool(
    @Param('idSchool') idSchool: string,
    @Param('idSerie') idSerie: string,
    @Query() params: PaginationParams,
  ) {
    return this.schoolClassService.findBySchoolAndSerie(
      idSchool,
      idSerie,
      params,
    )
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  add(
    @CurrentUser() user: User,
    @Body() createSchoolClassDto: CreateSchoolClassDto,
  ): Promise<SchoolClass> {
    return this.schoolClassService.add(createSchoolClassDto, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(':id')
  update(
    @CurrentUser() user: User,
    @Param() { id }: QueryIdParamDto,
    @Body() updateSchoolClassDto: UpdateSchoolClassDto,
  ): Promise<SchoolClass> {
    return this.schoolClassService.update(id, updateSchoolClassDto, user)
  }
}
