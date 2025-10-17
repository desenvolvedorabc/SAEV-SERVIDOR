import { Test, TestingModule } from '@nestjs/testing'

import { MessageTemplatesController } from './message-templates.controller'
import { MessageTemplatesService } from './message-templates.service'

describe('MessageTemplatesController', () => {
  let controller: MessageTemplatesController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessageTemplatesController],
      providers: [MessageTemplatesService],
    }).compile()

    controller = module.get<MessageTemplatesController>(
      MessageTemplatesController,
    )
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
