import { ApiProperty, PickType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsNotEmpty } from 'class-validator'
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
