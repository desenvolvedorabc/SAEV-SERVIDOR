import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Student } from 'src/modules/student/model/entities/student.entity'

import { Responsible } from './entities/responsible.entity'
import { ResponsiblesService } from './responsibles.service'

describe('ResponsiblesService', () => {
  let service: ResponsiblesService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResponsiblesService,
        {
          provide: getRepositoryToken(Responsible),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Student),
          useValue: {},
        },
      ],
    }).compile()

    service = module.get<ResponsiblesService>(ResponsiblesService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
