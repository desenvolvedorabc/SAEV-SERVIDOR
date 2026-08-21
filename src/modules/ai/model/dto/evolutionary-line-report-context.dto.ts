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

class EvolutionaryLineSubjectDto {
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
    type: Number,
    description: 'Quantidade de alunos avaliados (lançados)',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  @Min(0)
  countLaunched?: number

  @ApiPropertyOptional({
    type: Number,
    description: 'Percentual médio de acertos (0–100)',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  @Min(0)
  percentageRightQuestions?: number

  @ApiPropertyOptional({
    type: Number,
    description: 'Total de alunos matriculados',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  @Min(0)
  totalStudents?: number

  @ApiPropertyOptional({
    type: Number,
    description:
      'Percentual de participação (alunos avaliados / matriculados × 100)',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  @Min(0)
  percentageFinished?: number
}

class EvolutionaryLineEditionDto {
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
    type: [EvolutionaryLineSubjectDto],
    description: 'Disciplinas com dados de desempenho nesta edição',
  })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => EvolutionaryLineSubjectDto)
  subjects: EvolutionaryLineSubjectDto[]
}

export class EvolutionaryLineReportContextDto {
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
    type: [EvolutionaryLineEditionDto],
    description: 'Edições avaliativas com desempenho por disciplina',
  })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => EvolutionaryLineEditionDto)
  items: EvolutionaryLineEditionDto[]
}
