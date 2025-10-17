import { createReadStream } from 'node:fs'
import { join } from 'node:path'

import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { PaginationParams } from 'src/helpers/params'
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator'
import { JwtAuthGuard } from 'src/modules/auth/guard/jwt-auth.guard'
import { User } from 'src/modules/user/model/entities/user.entity'

import { ExportEvaluationTemplate } from './dto/export-evaluation-template.dto'
import { PaginationMicroDataDto } from './dto/pagination-microdata.dto'
import { MicrodataService } from './microdata.service'
import { MicrodataEvaluationDataStandardizedService } from './services/microdata-evaluation-data-standardized.service'

@ApiTags('Microdados')
@Controller('microdata')
export class MicrodataController {
  constructor(
    private readonly microdataService: MicrodataService,
    private readonly microdataStandardizedService: MicrodataEvaluationDataStandardizedService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  findAll(@Query() params: PaginationParams, @CurrentUser() user: User) {
    return this.microdataService.findAll(params, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/export-infrequency')
  exportInfrequency(
    @Query() params: PaginationMicroDataDto,
    @CurrentUser() user: User,
  ) {
    this.microdataService.exportInfrequencyData(params, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/export-evaluation-template')
  async exportEvaluationTemplate(
    @Query() params: ExportEvaluationTemplate,
    @CurrentUser() user: User,
  ) {
    const { assessmentsCounty } =
      await this.microdataService.validateExistsAssessmentForTemplate(params)

    this.microdataService.exportEvaluationTemplate(
      assessmentsCounty,
      params,
      user,
    )
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/export-students')
  exportStudents(
    @Query() params: PaginationMicroDataDto,
    @CurrentUser() user: User,
  ) {
    this.microdataService.exportStudentsData(params, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/export-evaluation-data')
  exportEvaluationData(
    @Query() params: PaginationMicroDataDto,
    @CurrentUser() user: User,
  ) {
    this.microdataService.exportEvaluationData(params, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/export-evaluation-data-standardized')
  exportEvaluationDataStandardized(
    @Query() params: PaginationMicroDataDto,
    @CurrentUser() user: User,
  ) {
    this.microdataStandardizedService.export(params, user)
  }

  @Get('/file/:filepath')
  seeUploadedFile(@Param('filepath') file: string, @Res() res) {
    const fileRead = createReadStream(
      join(process.cwd(), 'public', 'microdata', file),
    )

    res.setHeader('Content-Disposition', `attachment; filename=${file}`)
    res.setHeader('Content-Type', 'application/zip')
    fileRead.pipe(res)
  }
}
