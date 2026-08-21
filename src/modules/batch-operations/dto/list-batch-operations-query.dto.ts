import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsInt, IsOptional } from 'class-validator'

export class ListBatchOperationsQueryDto {
  @ApiProperty({ type: Number, default: 1, required: false })
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  page = 1

  @ApiProperty({ type: Number, default: 10, required: false })
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  limit = 10
}
