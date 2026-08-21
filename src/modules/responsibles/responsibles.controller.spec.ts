import { JwtService } from '@nestjs/jwt'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Student } from 'src/modules/student/model/entities/student.entity'

import { ForgetPasswordResponsible } from './entities/forget-password-responsible.entity'
import { Responsible } from './entities/responsible.entity'
import { ResponsiblesController } from './responsibles.controller'
import { ResponsiblesService } from './responsibles.service'
import { ResponsiblesAuthService } from './responsibles-auth.service'

describe('ResponsiblesController', () => {
  let controller: ResponsiblesController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResponsiblesController],
      providers: [
        ResponsiblesService,
        ResponsiblesAuthService,
        {
          provide: getRepositoryToken(Responsible),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ForgetPasswordResponsible),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Student),
          useValue: {},
        },
        {
          provide: JwtService,
          useValue: {},
        },
      ],
    }).compile()

    controller = module.get<ResponsiblesController>(ResponsiblesController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
