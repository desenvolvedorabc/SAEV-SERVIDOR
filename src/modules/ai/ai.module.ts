import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AreaGuard } from 'src/modules/auth/guard/area.guard'
import { SubProfile } from 'src/modules/profile/model/entities/sub-profile.entity'

import { AiProviderFactory } from './adapters/ai-provider.factory'
import { OpenAiAdapter } from './adapters/openai.adapter'
import { AiController } from './controller/ai.controller'
import { AiAnalysisService } from './service/ai-analysis.service'

@Module({
  imports: [TypeOrmModule.forFeature([SubProfile])],
  providers: [OpenAiAdapter, AiProviderFactory, AiAnalysisService, AreaGuard],
  controllers: [AiController],
  exports: [AiAnalysisService],
})
export class AiModule {}
