import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
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

// ─── Entidade (Regional / Escola / Turma / Aluno) ───────────────────────────

class PerformanceHistoryEntityDto {
  @ApiProperty({ type: Number, description: 'ID da entidade' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  id: number

  @ApiProperty({ type: String, description: 'Nome da entidade' })
  @IsString()
  @MaxLength(255)
  name: string

  @ApiPropertyOptional({
    type: Number,
    description:
      'Percentual de desempenho médio (0-100) — disciplinas Objetiva',
  })
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  avg?: number

  @ApiPropertyOptional({
    type: String,
    description:
      'Nível de leitura — disciplinas de Leitura (fluente, nao_fluente, frases, palavras, silabas, nao_leitor, nao_avaliado, nao_informado)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  type?: string
}

// ─── Prova (Disciplina dentro de uma edição) ────────────────────────────────

class PerformanceHistoryTestDto {
  @ApiProperty({ type: Number, description: 'ID da prova (TES_ID)' })
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
    type: String,
    description: 'Tipo da disciplina (ex: Objetiva, Leitura)',
  })
  @IsString()
  @MaxLength(50)
  dis_tipo: string

  @ApiProperty({
    type: [PerformanceHistoryEntityDto],
    description:
      'Entidades avaliadas (regionais, escolas, turmas ou alunos) com seus resultados',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PerformanceHistoryEntityDto)
  data: PerformanceHistoryEntityDto[]
}

// ─── Edição (Avaliação) ─────────────────────────────────────────────────────

class PerformanceHistoryEditionDto {
  @ApiProperty({ type: Number, description: 'ID da edição/avaliação (AVA_ID)' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  id: number

  @ApiProperty({
    type: String,
    description: 'Nome da edição/avaliação (ex: 1ª Avaliação 2024)',
  })
  @IsString()
  @MaxLength(255)
  name: string

  @ApiProperty({
    type: [PerformanceHistoryTestDto],
    description: 'Provas desta edição com dados de desempenho',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PerformanceHistoryTestDto)
  tests: PerformanceHistoryTestDto[]
}

// ─── Nível de Visualização ──────────────────────────────────────────────────

export enum PerformanceHistoryViewLevelEnum {
  REGIONAL = 'regional',
  SCHOOL = 'school',
  SCHOOL_CLASS = 'school_class',
  STUDENT = 'student',
}

// ─── Contexto Principal ─────────────────────────────────────────────────────

export class PerformanceHistoryReportContextDto {
  @ApiPropertyOptional({ type: SerieDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SerieDto)
  serie?: SerieDto

  @ApiPropertyOptional({ type: YearDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => YearDto)
  year?: YearDto

  @ApiPropertyOptional({ type: LocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  state?: LocationDto

  @ApiPropertyOptional({ type: LocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  stateRegional?: LocationDto

  @ApiPropertyOptional({ type: LocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  county?: LocationDto

  @ApiPropertyOptional({ type: LocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  countyRegional?: LocationDto

  @ApiPropertyOptional({ type: LocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  school?: LocationDto

  @ApiPropertyOptional({ type: LocationDto })
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

  @ApiPropertyOptional({
    enum: PerformanceHistoryViewLevelEnum,
    description:
      'Nível de visualização atual (regional, school, school_class, student)',
  })
  @IsEnum(PerformanceHistoryViewLevelEnum)
  @IsOptional()
  viewLevel?: PerformanceHistoryViewLevelEnum

  @ApiProperty({
    type: [PerformanceHistoryEditionDto],
    description:
      'Edições (avaliações) com provas e dados de desempenho histórico',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PerformanceHistoryEditionDto)
  items: PerformanceHistoryEditionDto[]
}
