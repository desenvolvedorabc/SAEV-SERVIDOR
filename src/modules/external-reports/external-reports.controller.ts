import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { PaginationParams } from 'src/helpers/params'
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator'
import { JwtAuthGuard } from 'src/modules/auth/guard/jwt-auth.guard'
import { User } from 'src/modules/user/model/entities/user.entity'
import { RoleProfile } from 'src/shared/enums/role.enum'

import { CreateExternalReportDto } from './dto/create-external-report.dto'
import { UpdateExternalReportDto } from './dto/update-external-report.dto'
import { ExternalReportsService } from './external-reports.service'

@Controller('external-reports')
@ApiTags('Relatórios Externos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExternalReportsController {
  constructor(
    private readonly externalReportsService: ExternalReportsService,
  ) {}

  @Post()
  create(
    @Body() createExternalReportDto: CreateExternalReportDto,
    @CurrentUser() user: User,
  ) {
    if (user?.USU_SPE?.role !== RoleProfile.SAEV) {
      throw new ForbiddenException()
    }
    return this.externalReportsService.create(createExternalReportDto, user)
  }

  @Get()
  findAll(@Query() params: PaginationParams, @CurrentUser() user: User) {
    return this.externalReportsService.findAll(params, user)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.externalReportsService.findOne(+id)
  }

  @Put(':id/toggle-active')
  toggleActive(@Param('id') id: string, @CurrentUser() user: User) {
    if (user?.USU_SPE?.role !== RoleProfile.SAEV) {
      throw new ForbiddenException()
    }

    return this.externalReportsService.toggleActive(+id, user)
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateExternalReportDto: UpdateExternalReportDto,
    @CurrentUser() user: User,
  ) {
    if (user?.USU_SPE?.role !== RoleProfile.SAEV) {
      throw new ForbiddenException()
    }

    return this.externalReportsService.update(
      +id,
      updateExternalReportDto,
      user,
    )
  }
}
