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
import { ReleasesReportContextDto } from './releases-report-context.dto'

export class ReleasesChatRequestDto {
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
    type: ReleasesReportContextDto,
    description: 'Contexto do Relatório de Lançamentos para análise',
  })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => ReleasesReportContextDto)
  context?: ReleasesReportContextDto
}
