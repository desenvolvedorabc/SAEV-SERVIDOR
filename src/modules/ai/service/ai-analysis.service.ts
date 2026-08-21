import { Injectable, Logger } from '@nestjs/common'
import { InternalServerError } from 'src/utils/errors'

import { AiProviderFactory } from '../adapters/ai-provider.factory'
import { ChatRequestDto } from '../model/dto/chat-request.dto'
import { DescriptorsChatRequestDto } from '../model/dto/descriptors-chat-request.dto'
import { EvolutionaryLineChatRequestDto } from '../model/dto/evolutionary-line-chat-request.dto'
import { EvolutionaryLineReadingChatRequestDto } from '../model/dto/evolutionary-line-reading-chat-request.dto'
import { EvolutionaryLineStudentChatRequestDto } from '../model/dto/evolutionary-line-student-chat-request.dto'
import { GroupingChatRequestDto } from '../model/dto/grouping-chat-request.dto'
import { NotEvaluatedChatRequestDto } from '../model/dto/not-evaluated-chat-request.dto'
import { PerformanceHistoryChatRequestDto } from '../model/dto/performance-history-chat-request.dto'
import { PerformanceLevelChatRequestDto } from '../model/dto/performance-level-chat-request.dto'
import { RaceChatRequestDto } from '../model/dto/race-chat-request.dto'
import { ReleasesChatRequestDto } from '../model/dto/releases-chat-request.dto'
import { SchoolAbsencesChatRequestDto } from '../model/dto/school-absences-chat-request.dto'
import { SyntheticTestChatRequestDto } from '../model/dto/synthetic-test-chat-request.dto'
import { AiProviderEnum } from '../model/enum/ai-provider.enum'
import { AiMessage } from '../model/interface/ai-provider.interface'
import {
  DescriptorsReportContext,
  EvolutionaryLineReadingReportContext,
  EvolutionaryLineReportContext,
  EvolutionaryLineStudentReportContext,
  GroupingReportContext,
  NotEvaluatedReportContext,
  PerformanceHistoryReportContext,
  PerformanceLevelReportContext,
  RaceReportContext,
  ReleasesReportContext,
  ReportContext,
  SchoolAbsencesReportContext,
  SyntheticTestReportContext,
} from '../model/interface/report-context.interface'
import { buildDescriptorsSystemPrompt } from '../utils/descriptors-prompt-builder.util'
import { buildEvolutionaryLineSystemPrompt } from '../utils/evolutionary-line-prompt-builder.util'
import { buildEvolutionaryLineReadingSystemPrompt } from '../utils/evolutionary-line-reading-prompt-builder.util'
import { buildEvolutionaryLineStudentSystemPrompt } from '../utils/evolutionary-line-student-prompt-builder.util'
import { buildGroupingSystemPrompt } from '../utils/grouping-prompt-builder.util'
import { buildNotEvaluatedSystemPrompt } from '../utils/not-evaluated-prompt-builder.util'
import { buildPerformanceHistorySystemPrompt } from '../utils/performance-history-prompt-builder.util'
import { buildPerformanceLevelSystemPrompt } from '../utils/performance-level-prompt-builder.util'
import { buildSystemPrompt } from '../utils/prompt-builder.util'
import { buildRaceSystemPrompt } from '../utils/race-prompt-builder.util'
import { buildReleasesSystemPrompt } from '../utils/releases-prompt-builder.util'
import {
  sanitizeDescriptorsReportContext,
  sanitizeEvolutionaryLineReadingReportContext,
  sanitizeEvolutionaryLineReportContext,
  sanitizeEvolutionaryLineStudentReportContext,
  sanitizeGroupingReportContext,
  sanitizeNotEvaluatedReportContext,
  sanitizePerformanceHistoryReportContext,
  sanitizePerformanceLevelReportContext,
  sanitizeRaceReportContext,
  sanitizeReleasesReportContext,
  sanitizeReportContext,
  sanitizeSchoolAbsencesReportContext,
  sanitizeSyntheticTestReportContext,
  sanitizeUserMessage,
} from '../utils/sanitize.util'
import { buildSchoolAbsencesSystemPrompt } from '../utils/school-absences-prompt-builder.util'
import { buildSyntheticTestSystemPrompt } from '../utils/synthetic-test-prompt-builder.util'

interface AiAnalysisConfig {
  provider?: AiProviderEnum
  model?: string
  temperature?: number
  maxTokens?: number
}

const DEFAULT_CONFIG: Required<AiAnalysisConfig> = {
  provider: AiProviderEnum.OPENAI,
  model: 'gpt-4.1-mini',
  temperature: 0.2,
  maxTokens: 30000,
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

  async *streamDescriptorsAnalysis(
    request: DescriptorsChatRequestDto,
    config: AiAnalysisConfig = {},
  ): AsyncIterable<string> {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config }

    const sanitizedContext = request.context
      ? sanitizeDescriptorsReportContext(
          request.context as DescriptorsReportContext,
        )
      : undefined

    const sanitizedMessages: AiMessage[] = request.messages.map((msg) => ({
      role: msg.role,
      content: sanitizeUserMessage(msg.content),
    }))

    const systemPrompt = buildDescriptorsSystemPrompt(sanitizedContext)
    const provider = this.aiProviderFactory.getProvider(mergedConfig.provider)

    this.logger.log(
      `Starting AI descriptors analysis stream with provider: ${mergedConfig.provider}, model: ${mergedConfig.model}`,
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
      this.logger.error('Error during AI descriptors analysis stream:', error)
      throw new InternalServerError()
    }
  }

  async *streamSyntheticTestAnalysis(
    request: SyntheticTestChatRequestDto,
    config: AiAnalysisConfig = {},
  ): AsyncIterable<string> {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config }

    const sanitizedContext = request.context
      ? sanitizeSyntheticTestReportContext(
          request.context as SyntheticTestReportContext,
        )
      : undefined

    const sanitizedMessages: AiMessage[] = request.messages.map((msg) => ({
      role: msg.role,
      content: sanitizeUserMessage(msg.content),
    }))

    const systemPrompt = buildSyntheticTestSystemPrompt(sanitizedContext)
    const provider = this.aiProviderFactory.getProvider(mergedConfig.provider)

    this.logger.log(
      `Starting AI synthetic test analysis stream with provider: ${mergedConfig.provider}, model: ${mergedConfig.model}`,
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
      this.logger.error(
        'Error during AI synthetic test analysis stream:',
        error,
      )
      throw new InternalServerError()
    }
  }

  async *streamPerformanceLevelAnalysis(
    request: PerformanceLevelChatRequestDto,
    config: AiAnalysisConfig = {},
  ): AsyncIterable<string> {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config }

    const sanitizedContext = request.context
      ? sanitizePerformanceLevelReportContext(
          request.context as PerformanceLevelReportContext,
        )
      : undefined

    const sanitizedMessages: AiMessage[] = request.messages.map((msg) => ({
      role: msg.role,
      content: sanitizeUserMessage(msg.content),
    }))

    const systemPrompt = buildPerformanceLevelSystemPrompt(sanitizedContext)
    const provider = this.aiProviderFactory.getProvider(mergedConfig.provider)

    this.logger.log(
      `Starting AI performance level analysis stream with provider: ${mergedConfig.provider}, model: ${mergedConfig.model}`,
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
      this.logger.error(
        'Error during AI performance level analysis stream:',
        error,
      )
      throw new InternalServerError()
    }
  }

  async *streamPerformanceHistoryAnalysis(
    request: PerformanceHistoryChatRequestDto,
    config: AiAnalysisConfig = {},
  ): AsyncIterable<string> {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config }

    const sanitizedContext = request.context
      ? sanitizePerformanceHistoryReportContext(
          request.context as PerformanceHistoryReportContext,
        )
      : undefined

    const sanitizedMessages: AiMessage[] = request.messages.map((msg) => ({
      role: msg.role,
      content: sanitizeUserMessage(msg.content),
    }))

    const systemPrompt = buildPerformanceHistorySystemPrompt(sanitizedContext)
    const provider = this.aiProviderFactory.getProvider(mergedConfig.provider)

    this.logger.log(
      `Starting AI performance history analysis stream with provider: ${mergedConfig.provider}, model: ${mergedConfig.model}`,
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
      this.logger.error(
        'Error during AI performance history analysis stream:',
        error,
      )
      throw new InternalServerError()
    }
  }

  async *streamNotEvaluatedAnalysis(
    request: NotEvaluatedChatRequestDto,
    config: AiAnalysisConfig = {},
  ): AsyncIterable<string> {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config }

    const sanitizedContext = request.context
      ? sanitizeNotEvaluatedReportContext(
          request.context as NotEvaluatedReportContext,
        )
      : undefined

    const sanitizedMessages: AiMessage[] = request.messages.map((msg) => ({
      role: msg.role,
      content: sanitizeUserMessage(msg.content),
    }))

    const systemPrompt = buildNotEvaluatedSystemPrompt(sanitizedContext)
    const provider = this.aiProviderFactory.getProvider(mergedConfig.provider)

    this.logger.log(
      `Starting AI not-evaluated analysis stream with provider: ${mergedConfig.provider}, model: ${mergedConfig.model}`,
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
      this.logger.error('Error during AI not-evaluated analysis stream:', error)
      throw new InternalServerError()
    }
  }

  async *streamSchoolAbsencesAnalysis(
    request: SchoolAbsencesChatRequestDto,
    config: AiAnalysisConfig = {},
  ): AsyncIterable<string> {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config }

    const sanitizedContext = request.context
      ? sanitizeSchoolAbsencesReportContext(
          request.context as SchoolAbsencesReportContext,
        )
      : undefined

    const sanitizedMessages: AiMessage[] = request.messages.map((msg) => ({
      role: msg.role,
      content: sanitizeUserMessage(msg.content),
    }))

    const systemPrompt = buildSchoolAbsencesSystemPrompt(sanitizedContext)
    const provider = this.aiProviderFactory.getProvider(mergedConfig.provider)

    this.logger.log(
      `Starting AI school absences analysis stream with provider: ${mergedConfig.provider}, model: ${mergedConfig.model}`,
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
      this.logger.error(
        'Error during AI school absences analysis stream:',
        error,
      )
      throw new InternalServerError()
    }
  }

  async *streamRaceAnalysis(
    request: RaceChatRequestDto,
    config: AiAnalysisConfig = {},
  ): AsyncIterable<string> {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config }

    const sanitizedContext = request.context
      ? sanitizeRaceReportContext(request.context as RaceReportContext)
      : undefined

    const sanitizedMessages: AiMessage[] = request.messages.map((msg) => ({
      role: msg.role,
      content: sanitizeUserMessage(msg.content),
    }))

    const systemPrompt = buildRaceSystemPrompt(sanitizedContext)

    const provider = this.aiProviderFactory.getProvider(mergedConfig.provider)

    this.logger.log(
      `Starting AI race analysis stream with provider: ${mergedConfig.provider}, model: ${mergedConfig.model}`,
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
      this.logger.error('Error during AI race analysis stream:', error)
      throw new InternalServerError()
    }
  }

  async *streamEvolutionaryLineAnalysis(
    request: EvolutionaryLineChatRequestDto,
    config: AiAnalysisConfig = {},
  ): AsyncIterable<string> {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config }

    const sanitizedContext = request.context
      ? sanitizeEvolutionaryLineReportContext(
          request.context as EvolutionaryLineReportContext,
        )
      : undefined

    const sanitizedMessages: AiMessage[] = request.messages.map((msg) => ({
      role: msg.role,
      content: sanitizeUserMessage(msg.content),
    }))

    const systemPrompt = buildEvolutionaryLineSystemPrompt(sanitizedContext)
    const provider = this.aiProviderFactory.getProvider(mergedConfig.provider)

    this.logger.log(
      `Starting AI evolutionary line analysis stream with provider: ${mergedConfig.provider}, model: ${mergedConfig.model}`,
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
      this.logger.error(
        'Error during AI evolutionary line analysis stream:',
        error,
      )
      throw new InternalServerError()
    }
  }

  async *streamEvolutionaryLineStudentAnalysis(
    request: EvolutionaryLineStudentChatRequestDto,
    config: AiAnalysisConfig = {},
  ): AsyncIterable<string> {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config }

    const sanitizedContext = request.context
      ? sanitizeEvolutionaryLineStudentReportContext(
          request.context as EvolutionaryLineStudentReportContext,
        )
      : undefined

    const sanitizedMessages: AiMessage[] = request.messages.map((msg) => ({
      role: msg.role,
      content: sanitizeUserMessage(msg.content),
    }))

    const systemPrompt =
      buildEvolutionaryLineStudentSystemPrompt(sanitizedContext)
    const provider = this.aiProviderFactory.getProvider(mergedConfig.provider)

    this.logger.log(
      `Starting AI evolutionary line student analysis stream with provider: ${mergedConfig.provider}, model: ${mergedConfig.model}`,
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
      this.logger.error(
        'Error during AI evolutionary line student analysis stream:',
        error,
      )
      throw new InternalServerError()
    }
  }

  async *streamReleasesAnalysis(
    request: ReleasesChatRequestDto,
    config: AiAnalysisConfig = {},
  ): AsyncIterable<string> {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config }

    const sanitizedContext = request.context
      ? sanitizeReleasesReportContext(request.context as ReleasesReportContext)
      : undefined

    const sanitizedMessages: AiMessage[] = request.messages.map((msg) => ({
      role: msg.role,
      content: sanitizeUserMessage(msg.content),
    }))

    const systemPrompt = buildReleasesSystemPrompt(sanitizedContext)
    const provider = this.aiProviderFactory.getProvider(mergedConfig.provider)

    this.logger.log(
      `Starting AI releases analysis stream with provider: ${mergedConfig.provider}, model: ${mergedConfig.model}`,
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
      this.logger.error('Error during AI releases analysis stream:', error)
      throw new InternalServerError()
    }
  }

  async *streamEvolutionaryLineReadingAnalysis(
    request: EvolutionaryLineReadingChatRequestDto,
    config: AiAnalysisConfig = {},
  ): AsyncIterable<string> {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config }

    const sanitizedContext = request.context
      ? sanitizeEvolutionaryLineReadingReportContext(
          request.context as EvolutionaryLineReadingReportContext,
        )
      : undefined

    const sanitizedMessages: AiMessage[] = request.messages.map((msg) => ({
      role: msg.role,
      content: sanitizeUserMessage(msg.content),
    }))

    const systemPrompt =
      buildEvolutionaryLineReadingSystemPrompt(sanitizedContext)

    const provider = this.aiProviderFactory.getProvider(mergedConfig.provider)

    this.logger.log(
      `Starting AI evolutionary line reading analysis stream with provider: ${mergedConfig.provider}, model: ${mergedConfig.model}`,
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
      this.logger.error(
        'Error during AI evolutionary line reading analysis stream:',
        error,
      )
      throw new InternalServerError()
    }
  }

  async *streamGroupingAnalysis(
    request: GroupingChatRequestDto,
    config: AiAnalysisConfig = {},
  ): AsyncIterable<string> {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config }

    const sanitizedContext = request.context
      ? sanitizeGroupingReportContext(request.context as GroupingReportContext)
      : undefined

    const sanitizedMessages: AiMessage[] = request.messages.map((msg) => ({
      role: msg.role,
      content: sanitizeUserMessage(msg.content),
    }))

    const systemPrompt = buildGroupingSystemPrompt(sanitizedContext)
    const provider = this.aiProviderFactory.getProvider(mergedConfig.provider)

    this.logger.log(
      `Starting AI grouping analysis stream with provider: ${mergedConfig.provider}, model: ${mergedConfig.model}`,
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
      this.logger.error('Error during AI grouping analysis stream:', error)
      throw new InternalServerError()
    }
  }
}
