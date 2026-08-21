import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
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
  EditionDto,
  LocationDto,
  SerieDto,
  YearDto,
} from './report-context.dto'

// ─── Gráfico de Séries ────────────────────────────────────────────────────────

class ReleasesSeriesItemDto {
  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  id: number

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(100)
  name: string

  @ApiProperty({
    type: Number,
    description: 'Percentual médio de preenchimento da série (0–100)',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  value: number
}

class ReleasesSeriesChartDto {
  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(50)
  type: string

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(50)
  level: string

  @ApiProperty({ type: [ReleasesSeriesItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReleasesSeriesItemDto)
  items: ReleasesSeriesItemDto[]
}

// ─── Disciplinas ──────────────────────────────────────────────────────────────

class ReleasesStudentSubjectDto {
  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  id: number

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(100)
  name: string

  @ApiProperty({
    type: Boolean,
    description: 'true = Realizado (✔) | false = Pendente (✘)',
  })
  @IsBoolean()
  isRelease: boolean
}

class ReleasesAggregateSubjectDto {
  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  id: number

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(100)
  name: string

  @ApiPropertyOptional({ type: Number })
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  grouped?: number

  @ApiPropertyOptional({ type: Number })
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  countTotalStudents?: number

  @ApiProperty({
    type: Number,
    description: 'Percentual de preenchimento (0–100)',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  percentageFinished: number
}

// ─── Items do Relatório ───────────────────────────────────────────────────────

class ReleasesItemDto {
  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  id: number

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(255)
  name: string

  @ApiPropertyOptional({
    type: String,
    description: 'Nome da turma (nível escola)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  classe?: string

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  inep?: string

  @ApiPropertyOptional({
    type: String,
    description: 'Tipo da escola (ESC_TIPO)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string

  @ApiPropertyOptional({ type: String, description: 'UF do município' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  uf?: string

  @ApiPropertyOptional({
    type: Number,
    description: 'Total de alunos enturmados',
  })
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  grouped?: number

  @ApiProperty({
    description:
      'Disciplinas: no nível aluno usa ReleasesStudentSubjectDto; demais usam ReleasesAggregateSubjectDto',
  })
  @IsArray()
  @ArrayMinSize(0)
  subjects: ReleasesStudentSubjectDto[] | ReleasesAggregateSubjectDto[]

  @ApiProperty({
    description:
      'No nível aluno: boolean (todos realizados?); demais: número (% geral de preenchimento)',
  })
  general: boolean | number
}

// ─── Contexto Principal ──────────────────────────────────────────────────────

export class ReleasesReportContextDto {
  @ApiPropertyOptional({
    description:
      'Série(s) selecionada(s) no filtro. Pode ser um objeto único ou um array quando múltiplas séries estão selecionadas.',
    oneOf: [
      { $ref: '#/components/schemas/SerieDto' },
      { type: 'array', items: { $ref: '#/components/schemas/SerieDto' } },
    ],
  })
  @IsOptional()
  serie?: SerieDto | SerieDto[]

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

  @ApiPropertyOptional({
    type: String,
    description:
      'Nível de granularidade: student | schoolClass | school | regional | county | stateRegional',
  })
  @IsOptional()
  @IsString()
  level?: string

  @ApiProperty({
    type: ReleasesSeriesChartDto,
    description: 'Gráfico de barras de preenchimento por série',
  })
  @IsObject()
  @ValidateNested()
  @Type(() => ReleasesSeriesChartDto)
  series: ReleasesSeriesChartDto

  @ApiProperty({
    type: [ReleasesItemDto],
    description: 'Itens do relatório (alunos ou entidades agregadas)',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReleasesItemDto)
  items: ReleasesItemDto[]
}
