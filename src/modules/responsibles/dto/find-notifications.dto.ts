import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator'

import {
  ResponsibleNotificationSubtype,
  ResponsibleNotificationType,
} from '../enums/responsible-notification.enum'

export class FindNotificationsDto {
  @ApiProperty({ default: 1, required: false })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page = 1

  @ApiProperty({ default: 10, required: false })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit = 10

  @ApiProperty({ enum: ResponsibleNotificationType, required: false })
  @IsEnum(ResponsibleNotificationType)
  @IsOptional()
  type?: ResponsibleNotificationType

  @ApiProperty({ enum: ResponsibleNotificationSubtype, required: false })
  @IsEnum(ResponsibleNotificationSubtype)
  @IsOptional()
  subtype?: ResponsibleNotificationSubtype

  @ApiProperty({ default: 'DESC', enum: ['ASC', 'DESC'], required: false })
  @IsOptional()
  order: 'ASC' | 'DESC' = 'DESC'

  @ApiProperty({
    description: 'Filtrar por status de leitura (true=lidas, false=não lidas)',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true
    if (value === 'false') return false
    return value
  })
  read?: boolean

  @ApiProperty({
    description: 'Filtrar por mês (1-12)',
    required: false,
    minimum: 1,
    maximum: 12,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(12)
  @Transform(({ value }) => parseInt(value))
  month?: number

  @ApiProperty({
    description: 'Filtrar por ano (ex: 2024)',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  year?: number
}
