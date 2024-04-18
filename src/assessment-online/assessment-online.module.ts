import { Module } from '@nestjs/common';
import { AssessmentOnlineService } from './assessment-online.service';
import { AssessmentOnlineController } from './assessment-online.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssessmentOnline } from './entities/assessment-online.entity';
import { AssessmentOnlineQuestion } from './entities/assessment-online-question.entity';
import { AssessmentOnlineQuestionAlternative } from './entities/assessment-online-question-alternative.entity';
import { AssessmentOnlinePage } from './entities/assessment-online-page.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    AssessmentOnline,
    AssessmentOnlinePage,
    AssessmentOnlineQuestion,
    AssessmentOnlineQuestionAlternative
  ])],
  controllers: [AssessmentOnlineController],
  providers: [AssessmentOnlineService]
})
export class AssessmentOnlineModule {}
