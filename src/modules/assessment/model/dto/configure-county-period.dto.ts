import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsDateString, IsEnum, IsInt, IsOptional } from 'class-validator'

import { TypeAssessmentEnum } from '../enum/type-assessment.enum'

export class ConfigureCountyPeriodDto {
  @ApiProperty({
    type: Number,
    description: 'ID da avaliação',
  })
  @Type(() => Number)
  @IsInt()
  assessmentId: number

  @ApiProperty({
    type: Date,
    description: 'Data de início do período do município',
  })
  @IsDateString()
  AVM_DT_INICIO: Date

  @ApiProperty({
    type: Date,
    description: 'Data de fim do período do município',
  })
  @IsDateString()
  AVM_DT_FIM: Date

  @ApiProperty({
    type: Date,
    description:
      'Data de disponibilização da avaliação (calculada automaticamente como Data de Início - 7 dias)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  AVM_DT_DISPONIVEL?: Date = null

  @ApiProperty({
    enum: TypeAssessmentEnum,
    description: 'Tipo da avaliação',
  })
  @IsEnum(TypeAssessmentEnum)
  AVM_TIPO: TypeAssessmentEnum
}
