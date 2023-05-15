import { PartialType } from '@nestjs/swagger';
import { CreateSchoolClassDto } from './create-school-class.dto';

export class UpdateSchoolClassDto extends PartialType(CreateSchoolClassDto) {}
