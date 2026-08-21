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
  LocationDto,
  SerieDto,
  YearDto,
} from './report-context.dto'

// ─── Dados de Cor/Raça ────────────────────────────────────────────────────────

class RaceDataDto {
  @ApiProperty({
    type: String,
    description: 'Nome da raça/cor (ex: Branca, Parda, Preta)',
  })
  @IsString()
  @MaxLength(100)
  name: string

  @ApiProperty({ type: Number, description: 'Total de alunos desta raça/cor' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  total: number

  @ApiProperty({
    type: Number,
    description: 'Percentual de desempenho desta raça/cor (0-100)',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  @Max(100)
  total_percent: number

  @ApiProperty({
    type: Number,
    description: 'Total de alunos matriculados desta raça/cor',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  countTotalStudents: number

  @ApiProperty({
    type: Number,
    description: 'Soma das notas dos alunos presentes (disciplinas objetivas)',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  totalGradesStudents: number

  @ApiProperty({
    type: Number,
    description: 'Total de alunos presentes na avaliação',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  countPresentStudents: number

  @ApiProperty({
    type: Number,
    description: 'Alunos com nível de leitura Fluente',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  fluente: number

  @ApiProperty({
    type: Number,
    description: 'Alunos com nível de leitura Não Fluente',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  nao_fluente: number

  @ApiProperty({ type: Number, description: 'Alunos que leem Frases' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  frases: number

  @ApiProperty({ type: Number, description: 'Alunos que leem Palavras' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  palavras: number

  @ApiProperty({ type: Number, description: 'Alunos que leem Sílabas' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  silabas: number

  @ApiProperty({ type: Number, description: 'Alunos Não Leitores' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  nao_leitor: number

  @ApiProperty({ type: Number, description: 'Alunos Não Avaliados' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  nao_avaliado: number

  @ApiProperty({
    type: Number,
    description: 'Alunos sem informação de raça/cor',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  nao_informado: number
}

// ─── Item de Edição ───────────────────────────────────────────────────────────

class RaceEditionItemDto {
  @ApiProperty({ type: Number, description: 'ID da edição/avaliação (AVA_ID)' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  id: number

  @ApiProperty({ type: String, description: 'Nome da edição/avaliação' })
  @IsString()
  @MaxLength(255)
  name: string

  @ApiProperty({
    type: Number,
    description: 'Percentual geral de desempenho nesta edição (0-100)',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  @Max(100)
  total_percent: number

  @ApiProperty({
    type: [RaceDataDto],
    description: 'Dados de desempenho por raça/cor nesta edição',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RaceDataDto)
  races: RaceDataDto[]
}

// ─── Disciplina ───────────────────────────────────────────────────────────────

class RaceSubjectDto {
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
  subject: string

  @ApiProperty({
    type: String,
    description: 'Tipo da disciplina (Objetiva ou Leitura)',
  })
  @IsString()
  @MaxLength(50)
  typeSubject: string

  @ApiProperty({
    type: [RaceEditionItemDto],
    description: 'Dados por edição/avaliação',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RaceEditionItemDto)
  items: RaceEditionItemDto[]
}

// ─── Contexto Principal ───────────────────────────────────────────────────────

export class RaceReportContextDto {
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
    type: [RaceSubjectDto],
    description: 'Disciplinas com dados de desempenho por raça/cor e edição',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RaceSubjectDto)
  items: RaceSubjectDto[]
}
