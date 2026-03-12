import { Injectable, Logger } from '@nestjs/common'
import OpenAI from 'openai'
import { InternalServerError } from 'src/utils/errors'

import {
  AiProviderAdapter,
  AiStreamConfig,
} from '../model/interface/ai-provider.interface'

@Injectable()
export class OpenAiAdapter implements AiProviderAdapter {
  private readonly client: OpenAI
  private readonly logger = new Logger(OpenAiAdapter.name)

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  async *streamText(config: AiStreamConfig): AsyncIterable<string> {
    const {
      model,
      systemPrompt,
      messages,
      temperature = 0.2,
      maxTokens = 2000,
    } = config

    const formattedMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ]

    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages: formattedMessages,
        temperature,
        max_completion_tokens: maxTokens,
        stream: true,
      })

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          yield content
        }
      }
    } catch (error) {
      this.logger.error('Error streaming from OpenAI:', error)
      throw new InternalServerError()
    }
  }
}
