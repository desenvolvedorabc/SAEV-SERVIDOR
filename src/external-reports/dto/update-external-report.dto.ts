import { PartialType } from '@nestjs/swagger';
import { CreateExternalReportDto } from './create-external-report.dto';

export class UpdateExternalReportDto extends PartialType(CreateExternalReportDto) {}
