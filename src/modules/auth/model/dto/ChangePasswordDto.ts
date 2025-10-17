import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  readonly password: string

  @IsString()
  @IsOptional()
  @ApiProperty()
  readonly token: string
}
