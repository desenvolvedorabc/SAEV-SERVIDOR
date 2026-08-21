import { PartialType } from '@nestjs/swagger'

import { CreateResponsibleDto } from './create-responsible.dto'

export class UpdateResponsibleDto extends PartialType(CreateResponsibleDto) {}
