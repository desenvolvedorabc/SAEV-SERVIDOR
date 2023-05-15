import { PartialType } from '@nestjs/swagger';
import { CreateSchoolYearDto } from './create-school-year.dto';

export class UpdateSchoolYearDto extends PartialType(CreateSchoolYearDto) {}
