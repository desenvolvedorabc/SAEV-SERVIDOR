import { PartialType } from '@nestjs/swagger';
import { CreateHeadquarterDto } from './create-headquarter.dto';

export class UpdateHeadquarterDto extends PartialType(CreateHeadquarterDto) {}
