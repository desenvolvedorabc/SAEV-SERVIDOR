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
import { ChangeValuationDateDTO } from '../model/dto/change-valuation-date.dto'
import { CreateAssessmentDto } from '../model/dto/create-assessment.dto'
import { UpdateAssessmentDto } from '../model/dto/update-assessment.dto'
import { Assessment } from '../model/entities/assessment.entity'
import { AssessmentsService } from '../service/assessment.service'

// criar um guard
// verificar o lancamento
// verificar validacao com o tipo
// fazer um check-in no sistema

@ApiTags('Avaliação')
@Controller('assessments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Post()
  add(
    @CurrentUser() user: User,
    @Body() createAssessmentDto: CreateAssessmentDto,
  ) {
    return this.assessmentsService.add(createAssessmentDto, user)
  }

  @Put(':id')
  update(
    @CurrentUser() user: User,
    @Param() { id }: QueryIdParamDto,
    @Body() updateAssessmentDto: UpdateAssessmentDto,
  ): Promise<Assessment> {
    return this.assessmentsService.update(id, updateAssessmentDto, user)
  }

  @Get('/years/:ano')
  findYears(
    @Param('ano') ano: string,
    @CurrentUser() user: User,
  ): Promise<Assessment[]> {
    return this.assessmentsService.findYears(ano, user)
  }

  @Get('/years')
  findAllYears(): Promise<Assessment[]> {
    return this.assessmentsService.findAllYears()
  }

  @Get('/release-results')
  findByReleaseResults(
    @Query() paginationParams: PaginationParams,
    @CurrentUser() user: User,
  ) {
    return this.assessmentsService.findByReleaseResults(paginationParams, user)
  }

  @Get(':id')
  findOne(@Param() { id }: QueryIdParamDto) {
    return this.assessmentsService.findOne(id)
  }

  @Get()
  async paginate(
    @Query() params: PaginationParams,
    @CurrentUser() user: User,
  ): Promise<Pagination<Assessment>> {
    return this.assessmentsService.paginate(params, user)
  }

  @Put('/change-valuation-date/:id')
  changeValuationDate(
    @CurrentUser() user: User,
    @Param() { id }: QueryIdParamDto,
    @Body() dto: ChangeValuationDateDTO,
  ) {
    return this.assessmentsService.changeValuationDate(dto, id, user)
  }

  @Get('/tests/download')
  getTestsByFilter(@Query() paginationParams: PaginationParams) {
    return this.assessmentsService.getTestsByFilter(paginationParams)
  }
}
