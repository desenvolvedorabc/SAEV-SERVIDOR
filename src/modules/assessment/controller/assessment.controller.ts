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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Pagination } from 'nestjs-typeorm-paginate'
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator'
import { Role } from 'src/modules/auth/decorator/role.decorator'
import { RolesGuard } from 'src/modules/auth/guard/roles.guard'
import { QueryIdParamDto } from 'src/modules/profile/model/dto/QueryIdParamDto'
import { User } from 'src/modules/user/model/entities/user.entity'
import { RoleProfile } from 'src/shared/enums/role.enum'

import { PaginationParams } from '../../../helpers/params'
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard'
import { ChangeValuationDateDTO } from '../model/dto/change-valuation-date.dto'
import { ConfigureCountyPeriodDto } from '../model/dto/configure-county-period.dto'
import { CreateAssessmentDto } from '../model/dto/create-assessment.dto'
import { UpdateAssessmentDto } from '../model/dto/update-assessment.dto'
import { Assessment } from '../model/entities/assessment.entity'
import { AssessmentsService } from '../service/assessment.service'

@ApiTags('Avaliação')
@Controller('assessments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Post('/')
  @Role([RoleProfile.SAEV, RoleProfile.ESTADO])
  add(
    @CurrentUser() user: User,
    @Body() createAssessmentDto: CreateAssessmentDto,
  ) {
    return this.assessmentsService.add(createAssessmentDto, user)
  }

  @Put('/:id')
  @Role([RoleProfile.SAEV, RoleProfile.ESTADO])
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

  @Get('/:id')
  findOne(@Param() { id }: QueryIdParamDto) {
    return this.assessmentsService.findOne(id)
  }

  @Get('/')
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

  @Get('/county/available')
  @Role([RoleProfile.MUNICIPIO_ESTADUAL, RoleProfile.MUNICIPIO_MUNICIPAL])
  @ApiOperation({
    summary: 'Lista avaliações disponíveis para o município configurar',
  })
  getAvailableAssessmentsForCounty(
    @Query() params: PaginationParams,
    @CurrentUser() user: User,
  ) {
    return this.assessmentsService.getAvailableAssessmentsForCounty(
      params,
      user,
    )
  }

  @Get('/county/:id')
  @Role([RoleProfile.MUNICIPIO_ESTADUAL, RoleProfile.MUNICIPIO_MUNICIPAL])
  @ApiOperation({
    summary:
      'Busca uma edição específica e verifica se o município está associado',
    description:
      'Retorna detalhes da edição, configuração do município e testes. Retorna 404 se o município não estiver associado à edição.',
  })
  getAssessmentForCounty(
    @CurrentUser() user: User,
    @Param() { id }: QueryIdParamDto,
  ) {
    return this.assessmentsService.getAssessmentForCounty(id, user)
  }

  @Post('/county/configure-period')
  @Role([RoleProfile.MUNICIPIO_ESTADUAL, RoleProfile.MUNICIPIO_MUNICIPAL])
  @ApiOperation({
    summary:
      'Permite que o município configure seu período de avaliação (data de disponibilização calculada automaticamente)',
  })
  configureCountyPeriod(
    @CurrentUser() user: User,
    @Body() dto: ConfigureCountyPeriodDto,
  ) {
    return this.assessmentsService.configureCountyPeriod(
      dto.assessmentId,
      user?.USU_MUN?.MUN_ID,
      {
        AVM_DT_INICIO: dto.AVM_DT_INICIO,
        AVM_DT_FIM: dto.AVM_DT_FIM,
        AVM_TIPO: dto.AVM_TIPO,
      },
      user,
    )
  }
}
