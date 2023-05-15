import { PartialType } from '@nestjs/swagger';
import { CreateSchoolAbsencesDto } from './create-school-absences.dto';

export class UpdateSchoolAbsencesDto extends PartialType(CreateSchoolAbsencesDto) {}
