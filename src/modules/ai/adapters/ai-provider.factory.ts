import { Injectable } from '@nestjs/common'

import { AiProviderEnum } from '../model/enum/ai-provider.enum'
import { AiProviderAdapter } from '../model/interface/ai-provider.interface'
// import { OpenAiAdapter } from './openai.adapter'

@Injectable()
export class AiProviderFactory {
  // constructor(private readonly openAiAdapter: OpenAiAdapter) {}

  getProvider(provider: AiProviderEnum): AiProviderAdapter {
    // switch (provider) {
    //   case AiProviderEnum.OPENAI:
    //     return this.openAiAdapter
    //   default:
    //     return this.openAiAdapter
    // }
    return null
  }
}
