import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator'

import { NotificationRuleType } from '../entities/notification-rule.entity'

export class NotificationRuleParametersDto {
  @ApiProperty({
    description:
      'Rendimento mínimo para disparo (apenas para BAIXO_RENDIMENTO)',
    example: 60,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  minimumPerformance?: number

  @ApiProperty({
    description:
      'Número máximo de faltas para disparo (apenas para EXCESSO_FALTAS)',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  maximumFouls?: number
}

export class CreateNotificationRuleDto {
  @ApiProperty({
    description: 'Tipo da regra de notificação',
    enum: NotificationRuleType,
    example: NotificationRuleType.BAIXO_RENDIMENTO,
  })
  @IsEnum(NotificationRuleType)
  ruleType: NotificationRuleType

  @ApiProperty({
    description: 'Título da notificação',
    example: 'Alerta de Rendimento Baixo',
  })
  @IsString()
  @IsNotEmpty()
  title: string

  @ApiProperty({
    description: 'Conteúdo da mensagem (markdown suportado)',
    example:
      'Olá **{{nome_responsavel}}**, seu filho(a) **{{nome_aluno}}** está com rendimento abaixo de {{rendimento_minimo}}%.',
  })
  @IsString()
  @IsNotEmpty()
  content: string

  @ApiProperty({
    description: 'Parâmetros específicos da regra',
    type: NotificationRuleParametersDto,
    required: false,
  })
  @IsOptional()
  @IsObject()
  @Type(() => NotificationRuleParametersDto)
  parameters?: NotificationRuleParametersDto
}
