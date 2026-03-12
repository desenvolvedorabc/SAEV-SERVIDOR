import { PartialType } from '@nestjs/swagger'

import { CreateNotificationRuleDto } from './create-notification-rule.dto'

export class UpdateNotificationRuleDto extends PartialType(
  CreateNotificationRuleDto,
) {}
