import { PartialType } from '@nestjs/swagger'

import { CreateMessageTemplateDto } from './create-message-template.dto'

export class UpdateMessageTemplateDto extends PartialType(
  CreateMessageTemplateDto,
) {}
