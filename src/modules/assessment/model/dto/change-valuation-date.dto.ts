import { ApiProperty } from '@nestjs/swagger'
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator'

import { TypeAssessmentEnum } from '../enum/type-assessment.enum'

export class ChangeValuationDateDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsArray()
  counties: Counties[]

  @ApiProperty()
  @IsDateString()
  newDate: Date
}

export class Counties {
  @ApiProperty()
  @IsNumber()
  id: number

  @ApiProperty()
  @IsString()
  type: TypeAssessmentEnum
}
