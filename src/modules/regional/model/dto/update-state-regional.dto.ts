import { ApiProperty, PartialType } from '@nestjs/swagger'
import { IsArray, IsOptional } from 'class-validator'

import { CreateStateRegionalDto } from './create-state-regional.dto'

export class UpdateStateRegionalDto extends PartialType(
  CreateStateRegionalDto,
) {
  @ApiProperty({
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  addCountiesIds: number[]

  @ApiProperty({
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  removeCountiesIds: number[]
}
