import { ApiProperty, PartialType } from '@nestjs/swagger'
import { IsArray, IsOptional } from 'class-validator'

import { CreateMunicipalRegionalDto } from './create-municipal-regional.dto'

export class UpdateMunicipalRegionalDto extends PartialType(
  CreateMunicipalRegionalDto,
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
