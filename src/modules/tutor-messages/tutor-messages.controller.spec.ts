import { Test, TestingModule } from '@nestjs/testing'

import { TutorMessagesController } from './controllers/tutor-messages.controller'
import { TutorMessagesService } from './services/tutor-messages.service'

describe('TutorMessagesController', () => {
  let controller: TutorMessagesController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TutorMessagesController],
      providers: [TutorMessagesService],
    }).compile()

    controller = module.get<TutorMessagesController>(TutorMessagesController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
