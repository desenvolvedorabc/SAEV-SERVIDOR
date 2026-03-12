import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsNumber } from 'class-validator'

import { TypeAssessmentEnum } from '../enum/type-assessment.enum'

export class AssessmentCountySimpleDto {
  @ApiProperty({
    type: Number,
    description: 'ID do município participante',
  })
  @IsNumber()
  countyId: number

  @ApiProperty({
    enum: TypeAssessmentEnum,
    description: 'Tipo da avaliação para este município',
    default: TypeAssessmentEnum.MUNICIPAL,
  })
  @IsEnum(TypeAssessmentEnum)
  type: TypeAssessmentEnum
}
