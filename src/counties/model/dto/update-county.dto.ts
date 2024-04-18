import { PartialType } from '@nestjs/swagger';
import { CreateCountyDto } from './create-county.dto';

export class UpdateCountyDto extends PartialType(CreateCountyDto) {}
