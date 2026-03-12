import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator'

import { ChatMessageDto } from './chat-message.dto'
import { ReportContextDto } from './report-context.dto'

export class ChatRequestDto {
  @ApiProperty({
    type: [ChatMessageDto],
    description: 'Array of chat messages',
    minItems: 1,
    maxItems: 50,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[]

  @ApiPropertyOptional({
    type: ReportContextDto,
    description: 'Report context data for analysis',
  })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => ReportContextDto)
  context?: ReportContextDto
}
