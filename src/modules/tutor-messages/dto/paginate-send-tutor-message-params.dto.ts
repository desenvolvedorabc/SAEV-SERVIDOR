import { ApiProperty, PickType } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsInt, IsNotEmpty, IsOptional } from 'class-validator'
import { PaginationParams } from 'src/helpers/params'

export class PaginateSendTutorMessageParamsDto extends PickType(
  PaginationParams,
  ['page', 'limit'],
) {
  @ApiProperty({
    required: true,
  })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  tutorMessageId: number
}

export class PaginateInAppDetailsParamsDto {
  @ApiProperty({ default: 1, required: false })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  page = 1

  @ApiProperty({ default: 10, required: false })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  limit = 10

  @ApiProperty({ required: true })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  tutorMessageId: number

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isCsv?: boolean = false
}
