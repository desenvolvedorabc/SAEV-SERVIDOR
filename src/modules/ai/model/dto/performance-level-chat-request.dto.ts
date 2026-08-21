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
import { PerformanceLevelReportContextDto } from './performance-level-report-context.dto'

export class PerformanceLevelChatRequestDto {
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
    type: PerformanceLevelReportContextDto,
    description: 'Contexto do relatório de Nível de Desempenho para análise',
  })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => PerformanceLevelReportContextDto)
  context?: PerformanceLevelReportContextDto
}
