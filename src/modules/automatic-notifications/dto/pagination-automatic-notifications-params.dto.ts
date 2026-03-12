import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsOptional } from 'class-validator'
import { PaginationParams } from 'src/helpers/params'

import { NotificationRuleType } from '../entities/notification-rule.entity'

export class PaginationAutomaticNotificationsParamsDto extends PaginationParams {
  @ApiProperty({
    description: 'Tipo da regra de notificação',
    enum: NotificationRuleType,
    example: NotificationRuleType.BAIXO_RENDIMENTO,
  })
  @IsEnum(NotificationRuleType)
  @IsOptional()
  ruleType?: NotificationRuleType
}
