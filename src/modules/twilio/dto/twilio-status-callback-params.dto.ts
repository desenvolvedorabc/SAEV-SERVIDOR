import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsNotEmpty, IsString } from 'class-validator'

export class TwilioStatusCallbackParamsDto {
  @ApiProperty({
    required: true,
  })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  id: number

  @ApiProperty({
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  type: 'manual' | 'automatic'
}
