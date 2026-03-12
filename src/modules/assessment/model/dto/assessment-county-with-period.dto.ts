import { ApiProperty } from '@nestjs/swagger'
import { IsDateString, IsEnum, IsNumber, IsOptional } from 'class-validator'

import { TypeAssessmentEnum } from '../enum/type-assessment.enum'

export class AssessmentCountyWithPeriodDto {
  @ApiProperty({
    type: Number,
    description: 'ID do município participante',
  })
  @IsOptional()
  assessmentCountyId?: number = null

  @ApiProperty({
    type: Number,
    description: 'ID do município participante',
  })
  @IsNumber()
  id: number

  @ApiProperty({
    enum: TypeAssessmentEnum,
    description: 'Tipo da avaliação para este município',
    default: TypeAssessmentEnum.MUNICIPAL,
  })
  @IsEnum(TypeAssessmentEnum)
  AVM_TIPO: TypeAssessmentEnum

  @ApiProperty({
    type: Date,
    description:
      'Data de início do período do município (opcional - SAEV pode definir)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  AVM_DT_INICIO?: Date

  @ApiProperty({
    type: Date,
    description:
      'Data de fim do período do município (opcional - SAEV pode definir)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  AVM_DT_FIM?: Date

  @ApiProperty({
    type: Date,
    description:
      'Data de disponibilização da avaliação (opcional - SAEV pode definir)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  AVM_DT_DISPONIVEL?: Date
}
