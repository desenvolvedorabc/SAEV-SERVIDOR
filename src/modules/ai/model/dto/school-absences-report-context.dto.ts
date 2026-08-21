import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator'

import { BreadcrumbItemDto, LocationDto, YearDto } from './report-context.dto'

class SchoolAbsencesMonthDto {
  @ApiProperty({ type: Number, description: 'Número do mês (1-12)' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  month: number

  @ApiProperty({ type: Number, description: 'Total de faltas no mês' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  total: number
}

class SchoolAbsencesGraphDto {
  @ApiProperty({
    type: [SchoolAbsencesMonthDto],
    description: 'Distribuição mensal de faltas',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SchoolAbsencesMonthDto)
  months: SchoolAbsencesMonthDto[]

  @ApiProperty({ type: Number, description: 'Total de faltas no período' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  total_infrequency: number

  @ApiProperty({ type: Number, description: 'Total de alunos enturmados' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  total_grouped: number
}

class SchoolAbsencesEntityDto {
  @ApiProperty({ type: Number, description: 'ID da entidade' })
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

  @ApiProperty({
    type: SchoolAbsencesGraphDto,
    description: 'Dados do gráfico da entidade',
  })
  @IsObject()
  @ValidateNested()
  @Type(() => SchoolAbsencesGraphDto)
  graph: SchoolAbsencesGraphDto
}

// ─── Contexto Principal ──────────────────────────────────────────────────────

export class SchoolAbsencesReportContextDto {
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

  @ApiPropertyOptional({
    type: String,
    description:
      'Nível de granularidade: county | stateRegionalId | municipalityOrUniqueRegionalId | school | serie | schoolClass | student',
  })
  @IsOptional()
  @IsString()
  level?: string

  @ApiPropertyOptional({
    type: SchoolAbsencesGraphDto,
    description: 'Gráfico consolidado geral (todos os filtros aplicados)',
  })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => SchoolAbsencesGraphDto)
  graph?: SchoolAbsencesGraphDto

  @ApiProperty({
    type: [SchoolAbsencesEntityDto],
    description:
      'Entidades listadas no relatório com seus gráficos individuais',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SchoolAbsencesEntityDto)
  items: SchoolAbsencesEntityDto[]
}
