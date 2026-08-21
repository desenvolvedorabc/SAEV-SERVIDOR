import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'
import { QuestionLevel } from 'src/shared/enums/question-level.enum'

import {
  BreadcrumbItemDto,
  EditionDto,
  LocationDto,
  SerieDto,
  YearDto,
} from './report-context.dto'

// ─── Opção de Questão ─────────────────────────────────────────────────────────

class SyntheticTestQuestionOptionDto {
  @ApiProperty({ type: Number, description: 'Índice da opção' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  id: number

  @ApiProperty({
    type: String,
    description: 'Letra da alternativa (A, B, C, D ou -)',
  })
  @IsString()
  @MaxLength(5)
  option: string

  @ApiProperty({
    type: Number,
    description: 'Total de alunos que marcaram esta alternativa',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  totalCorrect: number

  @ApiProperty({
    type: Number,
    description: 'Percentual de alunos que marcaram esta alternativa (0-100)',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  @Max(100)
  value: number
}

// ─── Acertos por Nível de Leitura ─────────────────────────────────────────────

class SyntheticTestReadingCorrectDto {
  @ApiProperty({
    type: Number,
    description: 'Percentual de acerto dos alunos fluentes (0-100)',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  @Max(100)
  fluente: number

  @ApiProperty({
    type: Number,
    description: 'Percentual de acerto dos alunos não fluentes (0-100)',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  @Max(100)
  nao_fluente: number

  @ApiProperty({
    type: Number,
    description: 'Percentual de acerto dos alunos que leem sílabas (0-100)',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  @Max(100)
  silabas: number

  @ApiProperty({
    type: Number,
    description: 'Percentual de acerto dos alunos que leem frases (0-100)',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  @Max(100)
  frases: number

  @ApiProperty({
    type: Number,
    description: 'Percentual de acerto dos alunos que leem palavras (0-100)',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  @Max(100)
  palavras: number

  @ApiProperty({
    type: Number,
    description: 'Percentual de acerto dos alunos não leitores (0-100)',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  @Max(100)
  nao_leitor: number

  @ApiProperty({
    type: Number,
    description: 'Percentual de acerto dos alunos não avaliados (0-100)',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  @Max(100)
  nao_avaliado: number

  @ApiProperty({
    type: Number,
    description: 'Percentual de acerto dos alunos não informados (0-100)',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  @Max(100)
  nao_informado: number
}

// ─── Questão ──────────────────────────────────────────────────────────────────

class SyntheticTestQuestionDto {
  @ApiProperty({ type: Number, description: 'ID da questão (TEG_ID)' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  id: number

  @ApiProperty({
    type: String,
    description: 'Gabarito da questão (A, B, C ou D)',
  })
  @IsString()
  @MaxLength(5)
  option: string

  @ApiProperty({ type: Number, description: 'Ordem da questão na prova' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  order: number

  @ApiProperty({
    type: String,
    description: 'Código/descrição do descritor avaliado',
  })
  @IsString()
  @MaxLength(500)
  descriptor: string

  @ApiPropertyOptional({
    enum: QuestionLevel,
    nullable: true,
    description:
      'Nível de dificuldade da questão (null quando o item não foi classificado)',
  })
  @IsOptional()
  @IsEnum(QuestionLevel)
  level?: QuestionLevel

  @ApiProperty({
    type: [SyntheticTestQuestionOptionDto],
    description: 'Distribuição de respostas por alternativa',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyntheticTestQuestionOptionDto)
  options: SyntheticTestQuestionOptionDto[]

  @ApiProperty({
    type: SyntheticTestReadingCorrectDto,
    description: 'Percentual de acerto por nível de leitura',
  })
  @IsObject()
  @ValidateNested()
  @Type(() => SyntheticTestReadingCorrectDto)
  reportReadingCorrect: SyntheticTestReadingCorrectDto
}

// ─── Resumo por Nível de Dificuldade ─────────────────────────────────────────

class SyntheticTestLevelSummaryDto {
  @ApiPropertyOptional({
    enum: QuestionLevel,
    nullable: true,
    description: 'Nível de dificuldade (null = itens não classificados)',
  })
  @IsOptional()
  @IsEnum(QuestionLevel)
  level?: QuestionLevel

  @ApiProperty({
    type: String,
    description: 'Rótulo do nível (Básico, Intermediário, Avançado...)',
  })
  @IsString()
  @MaxLength(50)
  label: string

  @ApiProperty({ type: Number, description: 'Quantidade de itens do nível' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  totalItems: number

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description:
      'Percentual de acerto do nível (0-100); null quando não há respostas',
  })
  @IsOptional()
  @Transform(({ value }) => (value === null ? null : Number(value)))
  @IsNumber()
  @Min(0)
  @Max(100)
  value?: number
}

// ─── Disciplina ───────────────────────────────────────────────────────────────

class SyntheticTestSubjectDto {
  @ApiProperty({ type: Number, description: 'ID do teste (TES_ID)' })
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
    description: 'Tipo da disciplina (ex: objetiva, leitura)',
  })
  @IsString()
  @MaxLength(50)
  typeSubject: string

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Indica se algum item do teste possui nível de dificuldade',
  })
  @IsOptional()
  @IsBoolean()
  hasLevelClassification?: boolean

  @ApiPropertyOptional({
    type: [SyntheticTestLevelSummaryDto],
    description: 'Acerto agregado por nível de dificuldade',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyntheticTestLevelSummaryDto)
  levelSummary?: SyntheticTestLevelSummaryDto[]

  @ApiProperty({
    type: [SyntheticTestQuestionDto],
    description: 'Questões da prova com distribuição de respostas',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyntheticTestQuestionDto)
  items: SyntheticTestQuestionDto[]
}

// ─── Contexto Principal ───────────────────────────────────────────────────────

export class SyntheticTestReportContextDto {
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
    type: [SyntheticTestSubjectDto],
    description: 'Disciplinas com questões e distribuição de respostas',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyntheticTestSubjectDto)
  items: SyntheticTestSubjectDto[]
}
