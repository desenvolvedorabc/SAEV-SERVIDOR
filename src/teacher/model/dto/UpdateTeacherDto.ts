import { PartialType } from '@nestjs/swagger';
import { CreateTeacherDto } from './CreateTeacherDto';

export class UpdateTeacherDto extends PartialType(CreateTeacherDto) {}
