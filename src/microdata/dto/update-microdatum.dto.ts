import { PartialType } from '@nestjs/swagger';
import { CreateMicrodatumDto } from './create-microdatum.dto';

export class UpdateMicrodatumDto extends PartialType(CreateMicrodatumDto) {}
