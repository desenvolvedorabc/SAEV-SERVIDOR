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
import { DescriptorsReportContextDto } from './descriptors-report-context.dto'

export class DescriptorsChatRequestDto {
  @ApiProperty({
    type: [ChatMessageDto],
    description: 'Histórico de mensagens do chat',
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
    type: DescriptorsReportContextDto,
    description: 'Contexto do relatório de descritores para análise',
  })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => DescriptorsReportContextDto)
  context?: DescriptorsReportContextDto
}
