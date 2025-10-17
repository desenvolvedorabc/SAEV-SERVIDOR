import { Test, TestingModule } from '@nestjs/testing'

import { MessageTemplatesService } from './message-templates.service'

describe('MessageTemplatesService', () => {
  let service: MessageTemplatesService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessageTemplatesService],
    }).compile()

    service = module.get<MessageTemplatesService>(MessageTemplatesService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
