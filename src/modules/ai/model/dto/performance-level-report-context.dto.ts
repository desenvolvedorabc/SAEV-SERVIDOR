import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
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

function toClampedPercentage(raw: unknown): number {
  const n = Number(raw)
  if (isNaN(n)) return 0
  return Math.min(100, Math.max(0, n))
}

// ─── Contagem por Nível de Desempenho ─────────────────────────────────────────

class PerformanceLevelStudentCountDto {
  @ApiProperty({
    type: Number,
    description: 'Quantidade de alunos com Menor Desempenho (< 25%)',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  ONE: number

  @ApiProperty({
    type: Number,
    description: 'Quantidade de alunos com Desempenho abaixo da média (25-49%)',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  TWO: number

  @ApiProperty({
    type: Number,
    description: 'Quantidade de alunos com Desempenho Mediano (50-74%)',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  TREE: number

  @ApiProperty({
    type: Number,
    description: 'Quantidade de alunos com Maior Desempenho (≥ 75%)',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  FOUR: number

  @ApiProperty({ type: Number, description: 'Total de alunos' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  TOTAL: number
}

// ─── Descritor ────────────────────────────────────────────────────────────────

class PerformanceLevelDescriptorDto {
  @ApiProperty({ type: Number, description: 'ID do descritor' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  id: number

  @ApiProperty({ type: String, description: 'Código do descritor (ex: D01)' })
  @IsString()
  @MaxLength(50)
  cod: string

  @ApiProperty({ type: String, description: 'Descrição/nome do descritor' })
  @IsString()
  @MaxLength(500)
  description: string

  @ApiPropertyOptional({
    type: Number,
    description: 'Total de acertos neste descritor',
  })
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  @Min(0)
  totalCorrect?: number

  @ApiPropertyOptional({
    type: Number,
    description: 'Total de respostas neste descritor',
  })
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  @Min(0)
  total?: number

  @ApiProperty({
    type: Number,
    description: 'Percentual de acertos neste descritor (0-100)',
  })
  @Transform(({ value }) => toClampedPercentage(value))
  @IsNumber()
  @Min(0)
  @Max(100)
  value: number
}

// ─── Item (Turma / Escola / Município) ────────────────────────────────────────

class PerformanceLevelItemDto {
  @ApiProperty({
    type: Number,
    description: 'ID do item (turma, escola, etc.)',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  id: number

  @ApiProperty({ type: String, description: 'Nome do item' })
  @IsString()
  @MaxLength(255)
  name: string

  @ApiPropertyOptional({
    type: String,
    description: 'Tipo do item (ex: URBANA, RURAL)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  type?: string

  @ApiProperty({
    type: Number,
    description: 'Percentual de desempenho médio do item (0-100)',
  })
  @Transform(({ value }) => toClampedPercentage(value))
  @IsNumber()
  @Min(0)
  @Max(100)
  value: number

  @ApiProperty({
    type: [PerformanceLevelDescriptorDto],
    description: 'Descritores deste item',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PerformanceLevelDescriptorDto)
  descriptors: PerformanceLevelDescriptorDto[]
}

// ─── Disciplina ───────────────────────────────────────────────────────────────

class PerformanceLevelSubjectDto {
  @ApiProperty({ type: Number, description: 'ID da disciplina (DIS_ID)' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  id: number

  @ApiProperty({
    type: String,
    description: 'Nome da disciplina (ex: Português, Matemática)',
  })
  @IsString()
  @MaxLength(100)
  name: string

  @ApiPropertyOptional({ type: String, description: 'Tipo da disciplina' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  type?: string

  @ApiProperty({
    type: Number,
    description: 'Percentual de desempenho geral da disciplina (0-100)',
  })
  @Transform(({ value }) => toClampedPercentage(value))
  @IsNumber()
  @Min(0)
  @Max(100)
  value: number

  @ApiProperty({
    type: PerformanceLevelStudentCountDto,
    description: 'Distribuição de alunos/itens por nível de desempenho',
  })
  @IsObject()
  @ValidateNested()
  @Type(() => PerformanceLevelStudentCountDto)
  TOTAL_STUDENTS: PerformanceLevelStudentCountDto

  @ApiProperty({
    type: [PerformanceLevelItemDto],
    description: 'Itens desta disciplina (turmas, escolas ou municípios)',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PerformanceLevelItemDto)
  items: PerformanceLevelItemDto[]

  @ApiProperty({
    type: [PerformanceLevelDescriptorDto],
    description: 'Descritores agregados da disciplina',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PerformanceLevelDescriptorDto)
  descriptors: PerformanceLevelDescriptorDto[]
}

// ─── Contexto Principal ───────────────────────────────────────────────────────

export class PerformanceLevelReportContextDto {
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
    type: [PerformanceLevelSubjectDto],
    description: 'Disciplinas com dados de nível de desempenho',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PerformanceLevelSubjectDto)
  items: PerformanceLevelSubjectDto[]
}
