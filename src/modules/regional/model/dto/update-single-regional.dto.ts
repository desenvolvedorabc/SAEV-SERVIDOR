import { ApiProperty, PartialType } from '@nestjs/swagger'
import { IsArray, IsOptional } from 'class-validator'

import { CreateSingleRegionalDto } from './create-single-regional.dto'

export class UpdateSingleRegionalDto extends PartialType(
  CreateSingleRegionalDto,
) {
  @ApiProperty({
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  addSchoolsIds: number[]

  @ApiProperty({
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  removeSchoolsIds: number[]
}
