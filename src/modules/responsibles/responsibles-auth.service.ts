import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import * as crypto from 'crypto'
import { hashPassword, matchPassword } from 'src/helpers/crypto'
import { sendEmail } from 'src/helpers/sendMail'
import { Student } from 'src/modules/student/model/entities/student.entity'
import { TermsService } from 'src/modules/terms/terms.service'
import { InternalServerError } from 'src/utils/errors'
import { responsibleChangePasswordSuccessTemplate } from 'templates/responsible-change-password-success'
import { responsibleForgetPasswordTemplate } from 'templates/responsible-forget-password'
import { Repository } from 'typeorm'

import { ChangePasswordAuthenticatedDto } from './dto/change-password-authenticated.dto'
import { ChangePasswordResponsibleDto } from './dto/change-password-responsible.dto'
import { ForgotPasswordResponsibleDto } from './dto/forgot-password-responsible.dto'
import { LoginResponsibleDto } from './dto/login-responsible.dto'
import { ForgetPasswordResponsible } from './entities/forget-password-responsible.entity'
import { Responsible } from './entities/responsible.entity'

@Injectable()
export class ResponsiblesAuthService {
  constructor(
    @InjectRepository(Responsible)
    private readonly responsibleRepository: Repository<Responsible>,

    @InjectRepository(ForgetPasswordResponsible)
    private readonly forgetPasswordRepository: Repository<ForgetPasswordResponsible>,

    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,

    private readonly jwtService: JwtService,
    private readonly termsService: TermsService,
  ) {}

  async login(dto: LoginResponsibleDto) {
    const responsible = await this.responsibleRepository
      .createQueryBuilder('responsible')
      .addSelect('responsible.password')
      .where('responsible.email = :email', {
        email: dto.email.toLowerCase().trim(),
      })
      .getOne()

    if (!responsible || !responsible.password) {
      throw new UnauthorizedException('Email ou senha inválidos.')
    }

    const passwordMatches = matchPassword(dto.password, responsible.password)

    if (!passwordMatches) {
      throw new UnauthorizedException('Email ou senha inválidos.')
    }

    if (!responsible.active) {
      throw new UnauthorizedException('Sua conta está inativa.')
    }

    const linkedStudentCount = await this.studentRepository.count({
      where: {
        ALU_RES: { id: responsible.id },
        ALU_ATIVO: true,
      },
    })

    if (linkedStudentCount === 0) {
      throw new UnauthorizedException('Nenhum aluno vinculado ao seu cadastro.')
    }

    const payload = {
      responsible: {
        id: responsible.id,
        email: responsible.email,
        name: responsible.name,
        active: responsible.active,
      },
    }

    const accessToken = await this.jwtService.signAsync(payload)

    const termsStatus = await this.termsService.getTermsStatus(
      responsible.termsAcceptedAt,
    )

    return {
      access_token: accessToken,
      token_type: 'JWT',
      expires_in: +process.env.JWT_SECONDS_EXPIRE,
      terms_status: termsStatus,
    }
  }

  async forgotPassword(dto: ForgotPasswordResponsibleDto) {
    const genericMessage =
      'Se o email estiver cadastrado, você receberá um código de recuperação.'

    const responsible = await this.responsibleRepository.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    })

    if (!responsible) {
      return { message: genericMessage }
    }

    const code = crypto.randomUUID().substring(0, 6).toUpperCase()

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 8)

    let forgetRecord = await this.forgetPasswordRepository.findOne({
      where: { responsible: { id: responsible.id } },
      relations: ['responsible'],
    })

    if (!forgetRecord) {
      forgetRecord = this.forgetPasswordRepository.create({
        token: code,
        isValid: true,
        expiresAt,
        responsible,
      })
    } else {
      forgetRecord.token = code
      forgetRecord.isValid = true
      forgetRecord.expiresAt = expiresAt
    }

    try {
      await this.forgetPasswordRepository.save(forgetRecord)

      const html = responsibleForgetPasswordTemplate(code)
      await sendEmail(
        responsible.email,
        'SAEV | Código de recuperação de senha',
        html,
      )

      return { message: genericMessage }
    } catch (e) {
      throw new InternalServerError()
    }
  }

  async validateToken(token: string) {
    const record = await this.forgetPasswordRepository.findOne({
      where: { token, isValid: true },
    })

    if (!record || record.expiresAt < new Date()) {
      return { valid: false }
    }

    return { valid: true }
  }

  async resetPassword(dto: ChangePasswordResponsibleDto) {
    const record = await this.forgetPasswordRepository.findOne({
      where: { token: dto.token, isValid: true },
      relations: ['responsible'],
    })

    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Token inválido ou expirado.')
    }

    try {
      const hashedPassword = hashPassword(dto.password)

      await this.responsibleRepository.update(record.responsible.id, {
        password: hashedPassword,
      })

      record.isValid = false
      await this.forgetPasswordRepository.save(record)

      const html = responsibleChangePasswordSuccessTemplate()
      await sendEmail(
        record.responsible.email,
        'SAEV | Senha alterada com sucesso',
        html,
      )
    } catch (e) {
      throw new InternalServerError()
    }
  }

  async checkTermsStatus(responsibleId: number) {
    const responsible = await this.responsibleRepository.findOne({
      where: { id: responsibleId },
    })
    if (!responsible) return null
    return this.termsService.getTermsStatus(responsible.termsAcceptedAt)
  }

  async changePassword(
    responsibleId: number,
    dto: ChangePasswordAuthenticatedDto,
  ) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Nova senha e confirmação não coincidem.')
    }

    const responsible = await this.responsibleRepository
      .createQueryBuilder('responsible')
      .addSelect('responsible.password')
      .where('responsible.id = :id', { id: responsibleId })
      .getOne()

    if (!responsible || !responsible.password) {
      throw new BadRequestException('Responsável não encontrado.')
    }

    const currentPasswordMatches = matchPassword(
      dto.currentPassword,
      responsible.password,
    )

    if (!currentPasswordMatches) {
      throw new BadRequestException('Senha atual incorreta.')
    }

    try {
      const hashedPassword = hashPassword(dto.newPassword)

      await this.responsibleRepository.update(responsibleId, {
        password: hashedPassword,
      })
    } catch (e) {
      throw new InternalServerError()
    }
  }
}
