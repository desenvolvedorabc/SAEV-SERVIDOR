import { Injectable, Logger } from '@nestjs/common'
import { InternalServerError } from 'src/utils/errors'

import { AiProviderFactory } from '../adapters/ai-provider.factory'
import { ChatRequestDto } from '../model/dto/chat-request.dto'
import { AiProviderEnum } from '../model/enum/ai-provider.enum'
import { AiMessage } from '../model/interface/ai-provider.interface'
import { ReportContext } from '../model/interface/report-context.interface'
import { buildSystemPrompt } from '../utils/prompt-builder.util'
import {
  sanitizeReportContext,
  sanitizeUserMessage,
} from '../utils/sanitize.util'

interface AiAnalysisConfig {
  provider?: AiProviderEnum
  model?: string
  temperature?: number
  maxTokens?: number
}

const DEFAULT_CONFIG: Required<AiAnalysisConfig> = {
  provider: AiProviderEnum.OPENAI,
  model: 'gpt-4o-mini',
  temperature: 0.2,
  maxTokens: 4000,
}

@Injectable()
export class AiAnalysisService {
  private readonly logger = new Logger(AiAnalysisService.name)

  constructor(private readonly aiProviderFactory: AiProviderFactory) {}

  async *streamAnalysis(
    request: ChatRequestDto,
    config: AiAnalysisConfig = {},
  ): AsyncIterable<string> {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config }

    const sanitizedContext = request.context
      ? sanitizeReportContext(request.context as ReportContext)
      : undefined

    const sanitizedMessages: AiMessage[] = request.messages.map((msg) => ({
      role: msg.role,
      content: sanitizeUserMessage(msg.content),
    }))

    const systemPrompt = buildSystemPrompt(sanitizedContext)
    const provider = this.aiProviderFactory.getProvider(mergedConfig.provider)

    this.logger.log(
      `Starting AI analysis stream with provider: ${mergedConfig.provider}, model: ${mergedConfig.model}`,
    )

    try {
      const stream = provider.streamText({
        model: mergedConfig.model,
        systemPrompt,
        messages: sanitizedMessages,
        temperature: mergedConfig.temperature,
        maxTokens: mergedConfig.maxTokens,
      })

      for await (const chunk of stream) {
        yield chunk
      }
    } catch (error) {
      this.logger.error('Error during AI analysis stream:', error)
      throw new InternalServerError()
    }
  }
}
