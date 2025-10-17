import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator'

export class CreateTutorMessageFiltersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  genderId?: number

  @ApiPropertyOptional()
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  schoolId: number

  @ApiPropertyOptional({
    example: [101, 102],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  serieIds?: number[]

  @ApiPropertyOptional({
    example: [101, 102],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  schoolClassIds?: number[]

  @ApiPropertyOptional({
    example: [101, 102],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  studentIds?: number[]

  @ApiPropertyOptional()
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  active: 1 | 0 = null
}

export class CreateTutorMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string

  @IsString()
  @ApiProperty()
  @IsNotEmpty()
  content: string

  @ApiPropertyOptional({ type: CreateTutorMessageFiltersDto })
  @ValidateNested()
  @IsNotEmpty()
  @Type(() => CreateTutorMessageFiltersDto)
  filters: CreateTutorMessageFiltersDto

  @ApiPropertyOptional()
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  newTemplate: 1 | 0 = 0

  @ApiPropertyOptional()
  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  forWpp: 1 | 0 = 0

  @ApiPropertyOptional()
  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  forEmail: 1 | 0 = 0
}
