import { Transform } from 'class-transformer'
import { IsNumber } from 'class-validator'

export class QueryIdParamDto {
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  id: number
}
