export interface AiMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AiStreamConfig {
  model: string
  systemPrompt: string
  messages: AiMessage[]
  temperature?: number
  maxTokens?: number
}

export interface AiProviderAdapter {
  streamText(config: AiStreamConfig): AsyncIterable<string>
}
