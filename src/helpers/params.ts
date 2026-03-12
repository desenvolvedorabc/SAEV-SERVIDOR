import { ApiProperty } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator'
import { format, parseISO } from 'date-fns'
import { TypeSchoolEnum } from 'src/modules/school/model/enum/type-school.enum'
import { MethodEnum } from 'src/modules/system-logs/model/enum/method.enum'
import { RoleProfile } from 'src/shared/enums/role.enum'

export class PaginationParams {
  @ApiProperty({
    type: Number,
    default: 1,
  })
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  page = 1

  @ApiProperty({
    type: Number,
    default: 10,
  })
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  limit = 10

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  search: string

  @ApiProperty({
    type: String,
    required: false,
    default: 'ASC',
  })
  @IsString()
  @IsOptional()
  order: 'ASC' | 'DESC' = 'ASC'

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  status: string

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsOptional()
  active?: '0' | '1' = null

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  column: string

  @ApiProperty({
    type: Number,
    required: false,
  })
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  @IsOptional()
  county: number

  @ApiProperty({
    type: Number,
    required: false,
  })
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  @IsOptional()
  school: number

  @ApiProperty({
    type: Number,
    required: false,
  })
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  @IsOptional()
  schoolClass: number

  @ApiProperty({
    type: Number,
    required: false,
  })
  @IsNumberString()
  @MinLength(1)
  @MaxLength(2)
  @IsOptional()
  month: number

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  profileBase: string

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  subProfile: string

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  subject: string

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  edition: string

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  serie: string

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  year: string

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  type: string

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  student: string

  @ApiProperty({
    enum: RoleProfile,
  })
  @IsEnum(RoleProfile)
  @IsOptional()
  roleProfile?: RoleProfile

  @ApiProperty({
    enum: TypeSchoolEnum,
  })
  @IsEnum(TypeSchoolEnum)
  @IsOptional()
  typeSchool?: TypeSchoolEnum = null

  @ApiProperty()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  stateId?: number

  @ApiProperty()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  stateRegionalId?: number

  @ApiProperty()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  municipalityOrUniqueRegionalId?: number

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsOptional()
  verifyExistsRegional?: '0' | '1' = null

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsOptional()
  isEpvPartner?: '0' | '1' = null

  @ApiProperty({
    type: Date,
    required: false,
  })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) =>
    value?.trim() ? format(parseISO(value), 'yyyy-MM-dd') : null,
  )
  date?: Date = null

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsOptional()
  isDestination?: '0' | '1' = null

  isCsv? = false

  countQueries? = false

  verifyProfileForState? = false

  @ApiProperty({
    type: Boolean,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  allCountyRegionals?: boolean = false
}

export class PaginationParamsLogs {
  @ApiProperty({
    type: String,
    default: '1',
  })
  @IsString()
  page: string

  @ApiProperty({
    type: String,
    default: '10',
  })
  @IsString()
  limit: string

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  search: string

  @ApiProperty({
    type: String,
    required: false,
    default: 'ASC',
  })
  @IsString()
  @IsOptional()
  order: 'ASC' | 'DESC'

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  column: string

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  county: string

  @ApiProperty({
    type: Number,
    required: false,
  })
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  @IsOptional()
  school: number

  @ApiProperty({
    enum: MethodEnum,
    required: false,
  })
  @IsEnum(MethodEnum)
  @IsOptional()
  method: MethodEnum

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  entity: string

  @ApiProperty({
    type: Date,
    required: false,
  })
  @IsDateString()
  @IsOptional()
  initialDate: Date

  @ApiProperty({
    type: Date,
    required: false,
  })
  @IsDateString()
  @IsOptional()
  finalDate: Date
}
