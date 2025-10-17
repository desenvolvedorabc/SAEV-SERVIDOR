import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { PaginationParams } from 'src/helpers/params'
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator'
import { QueryIdParamDto } from 'src/modules/profile/model/dto/QueryIdParamDto'
import { User } from 'src/modules/user/model/entities/user.entity'

import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard'
import { CreateStudentsTestsDto } from '../model/dto/create-students-tests.dto'
import { ImportResultStudentDto } from '../model/dto/import-result-students.dto'
import { StudentTest } from '../model/entities/student-test.entity'
import { ReleaseResultsService } from '../service/release-results.service'

@Controller('release-results')
@ApiTags('Lançamentos de Resultados')
export class ReleaseResultsController {
  constructor(private releaseResultsService: ReleaseResultsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/edition/:id')
  findByEdition(
    @Param() { id }: QueryIdParamDto,
    @Query()
    {
      page,
      limit,
      order,
      column,
      school,
      schoolClass,
      county,
      serie,
    }: PaginationParams,
  ) {
    limit = Number(limit) > 100 ? 100 : limit
    return this.releaseResultsService.findByEdition(
      id,
      order,
      column,
      school,
      schoolClass,
      county,
      serie,
      {
        page: +page,
        limit: +limit,
        route: ' ',
      },
    )
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  add(
    @CurrentUser() user: User,
    @Body() createAssessmentDto: CreateStudentsTestsDto,
  ): Promise<StudentTest> {
    return this.releaseResultsService.add(createAssessmentDto, user)
  }

  @Post('/import-result')
  @UseGuards(AuthGuard('basic'))
  @ApiBearerAuth()
  importResult(@Body() dto: ImportResultStudentDto) {
    return this.releaseResultsService.importResult(dto)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('/assessment-online')
  addByAssessmentOnline(
    @CurrentUser() user: User,
    @Body() createAssessmentDto: CreateStudentsTestsDto,
  ): Promise<StudentTest> {
    return this.releaseResultsService.addByAssessmentOnline(
      createAssessmentDto,
      user,
    )
  }

  @Post('/herby')
  @UseGuards(AuthGuard('basic'))
  @ApiBearerAuth()
  addByHerby(
    @Body() createAssessmentDto: CreateStudentsTestsDto,
  ): Promise<StudentTest> {
    return this.releaseResultsService.addByHerby(createAssessmentDto)
  }

  @Post('/edler')
  @UseGuards(AuthGuard('basic'))
  @ApiBearerAuth()
  addByEdler(
    @Body() createAssessmentDto: CreateStudentsTestsDto,
  ): Promise<StudentTest> {
    return this.releaseResultsService.addByEdler(createAssessmentDto)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete()
  delete(
    @Body() createAssessmentDto: CreateStudentsTestsDto,
  ): Promise<boolean> {
    return this.releaseResultsService.deleteStudentTestsAnswers(
      createAssessmentDto,
    )
  }
}
