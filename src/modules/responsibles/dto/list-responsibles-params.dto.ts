import { ApiProperty } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsInt, IsOptional, IsString } from 'class-validator'

export class ListResponsiblesParamsDto {
  @ApiProperty({ default: 1, required: false })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  page = 1

  @ApiProperty({ default: 10, required: false })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  limit = 10

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  search?: string

  @ApiProperty({ required: false, default: 'ASC' })
  @IsString()
  @IsOptional()
  order?: 'ASC' | 'DESC' = 'ASC'

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  column?: string

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isCsv?: boolean = false
}
