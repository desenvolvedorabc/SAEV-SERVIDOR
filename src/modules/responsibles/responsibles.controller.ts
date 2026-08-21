import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Parser } from 'json2csv'
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator'
import { JwtAuthGuard } from 'src/modules/auth/guard/jwt-auth.guard'
import { PushNotificationService } from 'src/modules/push-notification/push-notification.service'
import { User } from 'src/modules/user/model/entities/user.entity'
import { RoleProfile } from 'src/shared/enums/role.enum'

import { Role } from '../auth/decorator/role.decorator'
import { RolesGuard } from '../auth/guard/roles.guard'
import { CurrentResponsible } from './decorator/current-responsible.decorator'
import { ChangePasswordAuthenticatedDto } from './dto/change-password-authenticated.dto'
import { ChangePasswordResponsibleDto } from './dto/change-password-responsible.dto'
import { ForgotPasswordResponsibleDto } from './dto/forgot-password-responsible.dto'
import { ListResponsiblesParamsDto } from './dto/list-responsibles-params.dto'
import { LoginResponsibleDto } from './dto/login-responsible.dto'
import { RegisterDeviceDto } from './dto/register-device.dto'
import { UpdateResponsibleDto } from './dto/update-responsible.dto'
import { JwtResponsibleAuthGuard } from './guard/jwt-responsible-auth.guard'
import { IResponsible } from './model/interface/responsible.interface'
import { ResponsiblesService } from './responsibles.service'
import { ResponsiblesAuthService } from './responsibles-auth.service'
import { ResponsibleListingService } from './services/responsible-listing.service'

@Controller('responsibles')
@ApiTags('Responsáveis')
export class ResponsiblesController {
  constructor(
    private readonly responsiblesService: ResponsiblesService,
    private readonly responsiblesAuthService: ResponsiblesAuthService,
    private readonly responsibleListingService: ResponsibleListingService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  @Get('/listing')
  @Role([RoleProfile.ESCOLA])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listagem de responsáveis com métricas de engajamento',
  })
  findAllResponsibles(
    @Query() params: ListResponsiblesParamsDto,
    @CurrentUser() user: User,
  ) {
    return this.responsibleListingService.findAll(params, user)
  }

  @Get('/listing/export')
  @Role([RoleProfile.ESCOLA])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Exportar listagem de responsáveis (CSV)' })
  async exportResponsibles(
    @Query() params: ListResponsiblesParamsDto,
    @CurrentUser() user: User,
    @Res() res,
  ) {
    const data = await this.responsibleListingService.exportCsv(params, user)

    const fields = [
      'Município',
      'Escola',
      'Ano Letivo',
      'Série',
      'Turma',
      'Aluno',
      'Responsável',
      'E-mail',
      'Visualizadas',
      'Não Visualizadas',
      'Média Visualização (min)',
    ]
    const parser = new Parser({ fields, withBOM: true, delimiter: ',' })
    const csvData = parser.parse(data)

    const nameFile = `${Date.now()}-listagem-responsaveis.csv`
    res.setHeader('Content-Disposition', `attachment; filename=${nameFile}`)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.send(csvData)
  }

  @Post('/auth/login')
  @ApiOperation({ summary: 'Login do responsável no APP' })
  login(@Body() dto: LoginResponsibleDto) {
    return this.responsiblesAuthService.login(dto)
  }

  @Post('/auth/forgot-password')
  @ApiOperation({ summary: 'Solicitar código de recuperação de senha' })
  forgotPassword(@Body() dto: ForgotPasswordResponsibleDto) {
    return this.responsiblesAuthService.forgotPassword(dto)
  }

  @Post('/auth/validate-token')
  @ApiOperation({ summary: 'Validar token de recuperação de senha' })
  validateToken(@Body('token') token: string) {
    return this.responsiblesAuthService.validateToken(token)
  }

  @Patch('/auth/reset-password')
  @ApiOperation({ summary: 'Redefinir senha com token' })
  resetPassword(@Body() dto: ChangePasswordResponsibleDto) {
    return this.responsiblesAuthService.resetPassword(dto)
  }

  @Get('/app/students')
  @UseGuards(JwtResponsibleAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar alunos do responsável' })
  findStudents(@CurrentResponsible() responsible: IResponsible) {
    return this.responsiblesService.findStudents(responsible.id)
  }

  @Get('/app/me')
  @UseGuards(JwtResponsibleAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Perfil do responsável' })
  getProfile(@CurrentResponsible() responsible: IResponsible) {
    return this.responsiblesService.findOne(responsible.id)
  }

  @Patch('/app/me')
  @UseGuards(JwtResponsibleAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar perfil (nome)' })
  updateProfile(
    @CurrentResponsible() responsible: IResponsible,
    @Body() dto: UpdateResponsibleDto,
  ) {
    return this.responsiblesService.updateProfile(responsible.id, dto)
  }

  @Post('/app/device')
  @UseGuards(JwtResponsibleAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar token push do dispositivo' })
  registerDevice(
    @CurrentResponsible() responsible: IResponsible,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.responsiblesService.registerDevice(responsible.id, dto)
  }

  @Delete('/app/me')
  @UseGuards(JwtResponsibleAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Excluir conta do responsável' })
  deleteAccount(@CurrentResponsible() responsible: IResponsible) {
    return this.responsiblesService.deleteAccount(responsible.id)
  }

  @Delete('/app/device')
  @UseGuards(JwtResponsibleAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desregistrar device ao deslogar' })
  unregisterDevice(@CurrentResponsible() responsible: IResponsible) {
    return this.responsiblesService.unregisterDevice(responsible.id)
  }

  @Post('/app/avatar/upload')
  @UseGuards(JwtResponsibleAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload de avatar do responsável' })
  uploadAvatar(
    @CurrentResponsible() responsible: IResponsible,
    @Body() data: { filename: string; base64: string },
  ) {
    return this.responsiblesService.updateAvatar(
      responsible.id,
      data.filename,
      data.base64,
    )
  }

  @Get('/avatar/:imgpath')
  @ApiOperation({ summary: 'Visualizar avatar do responsável' })
  seeUploadedAvatar(@Param('imgpath') image: string, @Res() res) {
    return res.sendFile(image, { root: './public/responsible/avatar' })
  }

  @Patch('/app/change-password')
  @UseGuards(JwtResponsibleAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Redefinir senha (autenticado)' })
  changePassword(
    @CurrentResponsible() responsible: IResponsible,
    @Body() dto: ChangePasswordAuthenticatedDto,
  ) {
    return this.responsiblesAuthService.changePassword(responsible.id, dto)
  }

  @Get('/app/terms/status')
  @UseGuards(JwtResponsibleAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verificar se o responsável precisa aceitar termos',
  })
  checkTermsStatus(@CurrentResponsible() responsible: IResponsible) {
    return this.responsiblesAuthService.checkTermsStatus(responsible.id)
  }

  @Post('/app/terms/accept')
  @UseGuards(JwtResponsibleAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar aceite dos termos de uso' })
  acceptTerms(@CurrentResponsible() responsible: IResponsible) {
    return this.responsiblesService.acceptTerms(responsible.id)
  }
}
