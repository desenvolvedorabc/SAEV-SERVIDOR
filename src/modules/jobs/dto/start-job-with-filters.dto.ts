import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsNotEmpty, IsOptional } from 'class-validator'

export class StartJobWithFiltersDto {
  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  assessmentId: number

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  concurrency: number

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  stateId?: number

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  countyId?: number
}
