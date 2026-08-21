import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'

import {
  BreadcrumbItemDto,
  EditionDto,
  LocationDto,
  SerieDto,
  YearDto,
} from './report-context.dto'

class DescriptorItemDto {
  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  id: number

  @ApiProperty({
    type: String,
    description: 'Código do descritor (ex: P005, M012)',
  })
  @IsString()
  @MaxLength(50)
  cod: string

  @ApiProperty({
    type: String,
    description: 'Descrição da habilidade avaliada',
  })
  @IsString()
  @MaxLength(500)
  name: string

  @ApiProperty({ type: Number, description: 'Percentual de acertos (0-100)' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  @Max(100)
  value: number
}

class DescriptorsTopicDto {
  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  id: number

  @ApiProperty({ type: String, description: 'Nome do tópico/eixo temático' })
  @IsString()
  @MaxLength(255)
  name: string

  @ApiProperty({
    type: Number,
    description: 'Percentual de acertos do tópico (0-100)',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  @Max(100)
  value: number

  @ApiProperty({
    type: [DescriptorItemDto],
    description: 'Descritores do tópico',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DescriptorItemDto)
  descritores: DescriptorItemDto[]
}

class DescriptorsSubjectDto {
  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  id: number

  @ApiProperty({
    type: String,
    description: 'Nome da disciplina (ex: Português, Matemática)',
  })
  @IsString()
  @MaxLength(100)
  subject: string

  @ApiProperty({
    type: [DescriptorsTopicDto],
    description: 'Tópicos da disciplina',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DescriptorsTopicDto)
  topics: DescriptorsTopicDto[]
}

export class DescriptorsReportContextDto {
  @ApiPropertyOptional({ type: SerieDto })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => SerieDto)
  serie?: SerieDto

  @ApiPropertyOptional({ type: YearDto })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => YearDto)
  year?: YearDto

  @ApiPropertyOptional({ type: EditionDto })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => EditionDto)
  edition?: EditionDto

  @ApiPropertyOptional({ type: LocationDto })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  state?: LocationDto

  @ApiPropertyOptional({ type: LocationDto })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  stateRegional?: LocationDto

  @ApiPropertyOptional({ type: LocationDto })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  county?: LocationDto

  @ApiPropertyOptional({ type: LocationDto })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  countyRegional?: LocationDto

  @ApiPropertyOptional({ type: LocationDto })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  school?: LocationDto

  @ApiPropertyOptional({ type: LocationDto })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  schoolClass?: LocationDto

  @ApiPropertyOptional({ type: [BreadcrumbItemDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BreadcrumbItemDto)
  breadcrumb?: BreadcrumbItemDto[]

  @ApiProperty({
    type: [DescriptorsSubjectDto],
    description: 'Disciplinas com seus tópicos e descritores',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DescriptorsSubjectDto)
  items: DescriptorsSubjectDto[]
}
