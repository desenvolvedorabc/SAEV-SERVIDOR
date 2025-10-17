import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsNotEmpty } from 'class-validator'

export class TwilioStatusCallbackParamsDto {
  @ApiProperty({
    required: true,
  })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  sendTutorMessageId: number
}
