import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  IsArray,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
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

// ─── Aluno Não Avaliado ───────────────────────────────────────────────────────

const VALID_JUSTIFICATIONS = [
  'recusa',
  'ausencia',
  'abandono',
  'transferencia',
  'deficiencia',
  'nao_participou',
] as const

class NotEvaluatedStudentDto {
  @ApiProperty({ type: Number, description: 'ID do aluno' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  id: number

  @ApiProperty({ type: String, description: 'Nome do aluno' })
  @IsString()
  name: string

  @ApiPropertyOptional({
    type: String,
    description: 'Justificativa do não comparecimento',
    enum: VALID_JUSTIFICATIONS,
    nullable: true,
  })
  @IsOptional()
  @IsIn([...VALID_JUSTIFICATIONS, null])
  justificativa: (typeof VALID_JUSTIFICATIONS)[number] | null
}

// ─── Sub-item agregado ────────────────────────────────────────────────────────

class NotEvaluatedSubItemDto {
  @ApiProperty({
    type: Number,
    description: 'ID da entidade (turma/escola/município/regional)',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  id: number

  @ApiProperty({ type: String, description: 'Nome da entidade' })
  @IsString()
  name: string

  @ApiPropertyOptional({
    type: String,
    description: 'Tipo da escola (ESC_TIPO), se aplicável',
  })
  @IsOptional()
  @IsString()
  type?: string

  @ApiProperty({ type: Number, description: 'Alunos que recusaram participar' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  recusa: number

  @ApiProperty({
    type: Number,
    description: 'Alunos ausentes mas frequentando',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  ausencia: number

  @ApiProperty({ type: Number, description: 'Alunos que abandonaram a escola' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  abandono: number

  @ApiProperty({
    type: Number,
    description: 'Alunos transferidos para outra escola',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  transferencia: number

  @ApiProperty({
    type: Number,
    description: 'Alunos não participantes por deficiência',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  deficiencia: number

  @ApiProperty({
    type: Number,
    description: 'Alunos que não participaram (sem justificativa específica)',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  nao_participou: number

  @ApiProperty({ type: Number, description: 'Total de alunos matriculados' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  countTotalStudents: number

  @ApiProperty({ type: Number, description: 'Total de alunos com lançamento' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  countStudentsLaunched: number

  @ApiProperty({ type: Number, description: 'Total de alunos presentes' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  countPresentStudents: number
}

// ─── Gráfico de dados agregado ────────────────────────────────────────────────

class NotEvaluatedDataGraphDto {
  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  recusa: number

  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  ausencia: number

  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  abandono: number

  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  transferencia: number

  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  deficiencia: number

  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  nao_participou: number

  @ApiProperty({ type: Number, description: 'Total de alunos' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  total_alunos: number

  @ApiProperty({ type: Number, description: 'Total de alunos enturmados' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  total_enturmados: number

  @ApiPropertyOptional({
    type: Number,
    description: 'Total de alunos com lançamento',
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  total_lancados?: number

  @ApiPropertyOptional({ type: Number, description: 'Total de não avaliados' })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  total_nao_avaliados?: number
}

// ─── Disciplina ───────────────────────────────────────────────────────────────

class NotEvaluatedSubjectDto {
  @ApiProperty({ type: Number, description: 'ID do teste/disciplina' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  id: number

  @ApiProperty({
    type: String,
    description: 'Nome da disciplina (ex: Português, Matemática)',
  })
  @IsString()
  subject: string

  @ApiPropertyOptional({
    type: String,
    description: 'Tipo da disciplina (Objetiva ou Leitura)',
  })
  @IsOptional()
  @IsString()
  typeSubject?: string

  @ApiProperty({
    type: String,
    description:
      'Nível de granularidade dos dados: student | schoolClass | school | regionalSchool | county | regional',
  })
  @IsString()
  level: string

  @ApiProperty({
    type: String,
    enum: ['table', 'bar'],
    description: 'Tipo de visualização',
  })
  @IsIn(['table', 'bar'])
  type: 'table' | 'bar'

  @ApiPropertyOptional({
    type: [NotEvaluatedStudentDto],
    description:
      'Lista de alunos não avaliados (apenas quando level = student)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotEvaluatedStudentDto)
  students?: NotEvaluatedStudentDto[]

  @ApiPropertyOptional({
    type: [NotEvaluatedSubItemDto],
    description: 'Entidades agregadas (turma/escola/município/regional)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotEvaluatedSubItemDto)
  items?: NotEvaluatedSubItemDto[]

  @ApiProperty({
    type: NotEvaluatedDataGraphDto,
    description: 'Totais consolidados para o gráfico',
  })
  @IsObject()
  @ValidateNested()
  @Type(() => NotEvaluatedDataGraphDto)
  dataGraph: NotEvaluatedDataGraphDto
}

// ─── Contexto Principal ───────────────────────────────────────────────────────

export class NotEvaluatedReportContextDto {
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
    type: [NotEvaluatedSubjectDto],
    description: 'Disciplinas com dados de alunos não avaliados',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotEvaluatedSubjectDto)
  items: NotEvaluatedSubjectDto[]
}
