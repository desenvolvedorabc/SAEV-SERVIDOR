import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsNotEmpty, IsOptional } from 'class-validator'
import { TypeSchoolEnum } from 'src/modules/school/model/enum/type-school.enum'

export class ExportEvaluationTemplate {
  @ApiProperty({
    type: Number,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  assessmentId: number

  @ApiProperty({
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  stateId: number

  @ApiProperty({
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  countyId: number

  @ApiProperty({
    type: Number,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  serieId: number

  @ApiProperty({
    enum: TypeSchoolEnum,
  })
  @IsEnum(TypeSchoolEnum)
  @IsNotEmpty()
  typeSchool?: TypeSchoolEnum
}
