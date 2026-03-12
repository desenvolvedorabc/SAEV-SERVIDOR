import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class ChatMessageDto {
  @ApiProperty({
    enum: ['user', 'assistant'],
    description: 'Role of the message sender',
  })
  @IsEnum(['user', 'assistant'])
  @IsNotEmpty()
  role: 'user' | 'assistant'

  @ApiProperty({
    type: String,
    description: 'Message content',
    maxLength: 10000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string
}
