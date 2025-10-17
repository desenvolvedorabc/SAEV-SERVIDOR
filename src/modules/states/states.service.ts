import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { RoleProfile } from 'src/shared/enums/role.enum'
import { Repository } from 'typeorm'

import { User } from '../user/model/entities/user.entity'
import { State } from './model/entities/state.entity'

@Injectable()
export class StatesService {
  constructor(
    @InjectRepository(State)
    private statesRepository: Repository<State>,
  ) {}

  async findAll(user: User) {
    const queryBuilder = this.statesRepository.createQueryBuilder('States')

    if (user.USU_SPE.role !== RoleProfile.SAEV) {
      queryBuilder.andWhere('States.id = :stateId', { stateId: user?.stateId })
    }

    return await queryBuilder.getMany()
  }

  async findOne(id: number) {
    const state = await this.statesRepository.findOne({
      id,
    })

    if (!state) {
      throw new NotFoundException('Estado não encontrado')
    }

    return {
      state,
    }
  }
}
