import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'

import {
  BreadcrumbItemDto,
  LocationDto,
  SerieDto,
  YearDto,
} from './report-context.dto'

class EvolutionaryLineReadingSubjectDto {
  @ApiPropertyOptional({
    type: Number,
    description: 'Total de alunos matriculados',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  @Min(0)
  countTotalStudents?: number

  @ApiPropertyOptional({
    type: Number,
    description: 'Total de alunos presentes na avaliação',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  @Min(0)
  countPresentStudents?: number

  @ApiPropertyOptional({
    type: Number,
    description: 'Alunos com nível de leitura Fluente',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  @Min(0)
  fluente?: number

  @ApiPropertyOptional({
    type: Number,
    description: 'Alunos com nível de leitura Não Fluente',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  @Min(0)
  nao_fluente?: number

  @ApiPropertyOptional({
    type: Number,
    description: 'Alunos que leem Frases',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  @Min(0)
  frases?: number

  @ApiPropertyOptional({
    type: Number,
    description: 'Alunos que leem Palavras',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  @Min(0)
  palavras?: number

  @ApiPropertyOptional({
    type: Number,
    description: 'Alunos que leem Sílabas',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  @Min(0)
  silabas?: number

  @ApiPropertyOptional({
    type: Number,
    description: 'Alunos Não Leitores',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  @Min(0)
  nao_leitor?: number

  @ApiPropertyOptional({
    type: Number,
    description: 'Alunos Não Avaliados',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  @Min(0)
  nao_avaliado?: number

  @ApiPropertyOptional({
    type: Number,
    description: 'Alunos sem informação de nível de leitura',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  @Min(0)
  nao_informado?: number
}

class EvolutionaryLineReadingEditionDto {
  @ApiPropertyOptional({
    type: Number,
    description: 'ID da edição/avaliação (AVA_ID)',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  id?: number

  @ApiPropertyOptional({
    type: String,
    description: 'Nome da edição/avaliação (AVA_NOME)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string

  @ApiPropertyOptional({
    type: EvolutionaryLineReadingSubjectDto,
    description: 'Dados de leitura da edição (níveis e totais)',
  })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => EvolutionaryLineReadingSubjectDto)
  subject?: EvolutionaryLineReadingSubjectDto
}

export class EvolutionaryLineReadingReportContextDto {
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
    type: [EvolutionaryLineReadingEditionDto],
    description: 'Edições com dados de leitura aninhados em subject',
  })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => EvolutionaryLineReadingEditionDto)
  items: EvolutionaryLineReadingEditionDto[]
}
