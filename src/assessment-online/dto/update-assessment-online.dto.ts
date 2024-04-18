import { PartialType } from '@nestjs/swagger';
import { CreateAssessmentOnlineDto } from './create-assessment-online.dto';

export class UpdateAssessmentOnlineDto extends PartialType(CreateAssessmentOnlineDto) {}
