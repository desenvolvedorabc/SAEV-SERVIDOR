import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class RegisterDeviceDto {
  @ApiProperty({ description: 'Push token do dispositivo (FCM token)' })
  @IsString()
  @IsNotEmpty()
  pushToken: string
}
