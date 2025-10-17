import { Test, TestingModule } from '@nestjs/testing'

import { TutorMessagesService } from './services/tutor-messages.service'

describe('TutorMessagesService', () => {
  let service: TutorMessagesService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TutorMessagesService],
    }).compile()

    service = module.get<TutorMessagesService>(TutorMessagesService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
