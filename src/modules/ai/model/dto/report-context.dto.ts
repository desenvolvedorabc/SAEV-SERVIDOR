import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator'

class BreadcrumbItemDto {
  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(100)
  label: string

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(255)
  name: string
}

class SerieDto {
  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(100)
  SER_NOME: string

  @ApiPropertyOptional({ type: Number })
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  SER_NUMBER?: number
}

class YearDto {
  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(10)
  name: string
}

class EditionDto {
  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(255)
  name: string
}

class LocationDto {
  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(255)
  name: string
}

class QuestDto {
  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  id: number

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(5)
  letter: string

  @ApiProperty({ enum: ['right', 'wrong'] })
  @IsString()
  type: 'right' | 'wrong'

  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  questionId: number
}

class StudentDto {
  @ApiPropertyOptional({ type: Number })
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  id?: number

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(255)
  name: string

  @ApiPropertyOptional({ type: Number })
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  avg?: number

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  type?: string

  @ApiPropertyOptional({ type: [QuestDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => QuestDto)
  quests?: QuestDto[]
}

class DescriptorDto {
  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  id: number

  @ApiPropertyOptional({ type: Number })
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  TEG_ORDEM?: number

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(50)
  cod: string

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(500)
  description: string
}

class QuestsInfoDto {
  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  total: number

  @ApiProperty({ type: [DescriptorDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DescriptorDto)
  descriptors: DescriptorDto[]
}

class DataGraphDto {
  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  fluente: number

  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  nao_fluente: number

  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  frases: number

  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  palavras: number

  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  silabas: number

  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  nao_leitor: number

  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  nao_avaliado: number

  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  nao_informado: number
}

class ReportSubItemDto {
  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  id: number

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(255)
  name: string

  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  value: number

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  type?: string

  @ApiPropertyOptional({ type: Number })
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  countTotalStudents?: number

  @ApiPropertyOptional({ type: Number })
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  countPresentStudents?: number

  @ApiPropertyOptional({ type: Number })
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  totalGradesStudents?: number

  @ApiPropertyOptional({ type: Number })
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  fluente?: number

  @ApiPropertyOptional({ type: Number })
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  nao_fluente?: number

  @ApiPropertyOptional({ type: Number })
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  frases?: number

  @ApiPropertyOptional({ type: Number })
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  palavras?: number

  @ApiPropertyOptional({ type: Number })
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  silabas?: number

  @ApiPropertyOptional({ type: Number })
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  nao_leitor?: number

  @ApiPropertyOptional({ type: Number })
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  nao_avaliado?: number

  @ApiPropertyOptional({ type: Number })
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  nao_informado?: number
}

class ReportItemDto {
  @ApiProperty({ type: Number })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  id: number

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(100)
  subject: string

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  type?: string

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  typeSubject?: string

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  level?: string

  @ApiPropertyOptional({ type: Number })
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  avg?: number

  @ApiPropertyOptional({ type: Number })
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  min?: number

  @ApiPropertyOptional({ type: Number })
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  max?: number

  @ApiPropertyOptional({ type: [ReportSubItemDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ReportSubItemDto)
  items?: ReportSubItemDto[]

  @ApiPropertyOptional({ type: [StudentDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => StudentDto)
  students?: StudentDto[]

  @ApiPropertyOptional({ type: QuestsInfoDto })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => QuestsInfoDto)
  quests?: QuestsInfoDto

  @ApiPropertyOptional({ type: DataGraphDto })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => DataGraphDto)
  dataGraph?: DataGraphDto

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  optionsReading?: string[]

  @ApiPropertyOptional({ type: Number })
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  numberSerie?: number
}

export class ReportContextDto {
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

  @ApiPropertyOptional({ type: [ReportItemDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ReportItemDto)
  items?: ReportItemDto[]
}
