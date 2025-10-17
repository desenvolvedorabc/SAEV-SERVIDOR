import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class CreateMessageTemplateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string
}
