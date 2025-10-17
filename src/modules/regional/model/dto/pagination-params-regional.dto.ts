import { PickType } from '@nestjs/mapped-types'
import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsOptional } from 'class-validator'
import { PaginationParams } from 'src/helpers/params'

import { TypeRegionalEnum } from '../enum/type-regional.enum'

export class PaginateParamsRegional extends PickType(PaginationParams, [
  'page',
  'limit',
  'search',
  'order',
  'stateId',
  'county',
  'isCsv',
  'typeSchool',
  'countQueries',
  'verifyProfileForState',
]) {
  @ApiProperty({
    enum: TypeRegionalEnum,
  })
  @IsEnum(TypeRegionalEnum)
  @IsOptional()
  type: TypeRegionalEnum
}
