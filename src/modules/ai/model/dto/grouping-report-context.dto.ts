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

class GroupingStudentDto {
  @ApiProperty({ type: Number, description: 'ID do aluno' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  id: number

  @ApiProperty({ type: String, description: 'Nome do aluno' })
  @IsString()
  name: string

  @ApiPropertyOptional({ type: String, description: 'CPF do aluno' })
  @IsOptional()
  @IsString()
  cpf?: string

  @ApiPropertyOptional({ type: String, description: 'Nome da mãe' })
  @IsOptional()
  @IsString()
  motherName?: string

  @ApiPropertyOptional({
    type: String,
    description: 'Data de nascimento (ISO)',
  })
  @IsOptional()
  @IsString()
  birthDate?: string
}

class GroupingEntityDto {
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

  @ApiProperty({ type: Number, description: 'Total de alunos da rede' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  totalStudents: number

  @ApiProperty({ type: Number, description: 'Total de alunos enturmados' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  totalGrouped: number

  @ApiProperty({ type: Number, description: 'Total de alunos não enturmados' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  totalNotGrouped: number
}

export class GroupingReportContextDto {
  @ApiPropertyOptional({ type: YearDto, description: 'Ano letivo' })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => YearDto)
  year?: YearDto

  @ApiPropertyOptional({ type: LocationDto, description: 'Estado' })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  state?: LocationDto

  @ApiPropertyOptional({ type: LocationDto, description: 'Regional estadual' })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  stateRegional?: LocationDto

  @ApiPropertyOptional({ type: LocationDto, description: 'Município' })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  county?: LocationDto

  @ApiPropertyOptional({
    type: LocationDto,
    description: 'Regional municipal/única',
  })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  countyRegional?: LocationDto

  @ApiPropertyOptional({ type: LocationDto, description: 'Escola' })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  school?: LocationDto

  @ApiPropertyOptional({ type: LocationDto, description: 'Turma' })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  schoolClass?: LocationDto

  @ApiPropertyOptional({
    type: [BreadcrumbItemDto],
    description: 'Caminho de filtros aplicados',
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BreadcrumbItemDto)
  breadcrumb?: BreadcrumbItemDto[]

  @ApiPropertyOptional({
    type: String,
    description:
      'Nível de granularidade atual: state | stateRegional | county | countyRegional | school | serie | schoolClass',
  })
  @IsOptional()
  @IsString()
  level?: string

  @ApiPropertyOptional({
    type: Number,
    description: 'Total geral de alunos da rede no filtro atual',
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  totalStudents?: number

  @ApiPropertyOptional({
    type: Number,
    description: 'Total de alunos enturmados no filtro atual',
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  totalGrouped?: number

  @ApiPropertyOptional({
    type: Number,
    description: 'Total de alunos não enturmados no filtro atual',
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  totalNotGrouped?: number

  @ApiProperty({
    description:
      'Itens do relatório: entidades agregadas (não-turma) ou lista nominal de alunos (nível turma)',
    oneOf: [
      {
        type: 'array',
        items: { $ref: '#/components/schemas/GroupingEntityDto' },
      },
      {
        type: 'array',
        items: { $ref: '#/components/schemas/GroupingStudentDto' },
      },
    ],
  })
  @IsArray()
  items: GroupingEntityDto[] | GroupingStudentDto[]
}
