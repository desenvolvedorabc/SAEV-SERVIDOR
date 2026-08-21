import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'

import { ReadingType } from '../interface/report-context.interface'
import {
  BreadcrumbItemDto,
  LocationDto,
  SerieDto,
  YearDto,
} from './report-context.dto'

const READING_TYPES: ReadingType[] = [
  'fluente',
  'nao_fluente',
  'frases',
  'palavras',
  'silabas',
  'nao_leitor',
  'nao_avaliado',
  'nao_informado',
]

class EvolutionaryLineStudentSubjectDto {
  @ApiPropertyOptional({ type: Number, description: 'ID da disciplina' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  @Min(0)
  id?: number

  @ApiPropertyOptional({ type: String, description: 'Nome da disciplina' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string

  @ApiPropertyOptional({
    type: String,
    description: 'Cor da disciplina no gráfico',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  color?: string

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Data de atualização da avaliação (ISO string)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  date?: string | null

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Se o aluno participou (finalizou) esta avaliação',
  })
  @IsBoolean()
  @IsOptional()
  isParticipated?: boolean

  @ApiPropertyOptional({
    type: Number,
    description:
      'Percentual de acerto (0–100) para disciplinas objetivas; 100 se fluente, 0 caso contrário para leitura',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  @Min(0)
  totalRightQuestions?: number

  @ApiPropertyOptional({
    enum: READING_TYPES,
    description:
      'Nível de leitura do aluno (apenas disciplinas de Leitura/não-objetivas)',
  })
  @IsEnum(READING_TYPES)
  @IsOptional()
  readType?: ReadingType
}

class EvolutionaryLineStudentEditionDto {
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

  @ApiProperty({
    type: [EvolutionaryLineStudentSubjectDto],
    description: 'Disciplinas com resultado do aluno nesta edição',
  })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => EvolutionaryLineStudentSubjectDto)
  subjects: EvolutionaryLineStudentSubjectDto[]
}

export class EvolutionaryLineStudentReportContextDto {
  @ApiPropertyOptional({ type: String, description: 'Nome do aluno' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  studentName?: string

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
    type: [EvolutionaryLineStudentEditionDto],
    description: 'Edições avaliativas com resultado individual do aluno',
  })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => EvolutionaryLineStudentEditionDto)
  items: EvolutionaryLineStudentEditionDto[]
}
