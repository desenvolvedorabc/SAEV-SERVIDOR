import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { CountiesService } from 'src/modules/counties/service/counties.service'
import { StatesService } from 'src/modules/states/states.service'
import { User } from 'src/modules/user/model/entities/user.entity'
import { RoleProfile } from 'src/shared/enums/role.enum'
import { InternalServerError } from 'src/utils/errors'
import { validateAllowedRoles } from 'src/utils/validate-allowed-roles'
import { Repository } from 'typeorm'

import { CreateStateRegionalDto } from '../model/dto/create-state-regional.dto'
import { UpdateStateRegionalDto } from '../model/dto/update-state-regional.dto'
import { Regional } from '../model/entities/regional.entity'
import { TypeRegionalEnum } from '../model/enum/type-regional.enum'
import { RegionalService } from '../regional.service'

const rolesForTypeRegional = {
  [TypeRegionalEnum.ESTADUAL]: [RoleProfile.SAEV, RoleProfile.ESTADO],
}

@Injectable()
export class StateRegionalService {
  constructor(
    @InjectRepository(Regional)
    private regionalRepository: Repository<Regional>,

    private readonly regionalService: RegionalService,

    private readonly statesService: StatesService,
    private readonly countiesService: CountiesService,
  ) {}

  async create(dto: CreateStateRegionalDto, user: User) {
    validateAllowedRoles(rolesForTypeRegional[TypeRegionalEnum.ESTADUAL], user)

    await this.statesService.findOne(dto.stateId)

    await this.regionalService.verifyExistsRegionalByNameAndStateAndType(
      dto.name,
      dto.stateId,
      TypeRegionalEnum.ESTADUAL,
    )

    const regional = this.regionalRepository.create({
      name: dto.name,
      stateId: dto.stateId,
      type: TypeRegionalEnum.ESTADUAL,
    })

    try {
      await this.regionalRepository.save(regional, {
        data: user,
      })

      dto?.countiesIds?.map((id) => {
        return this.countiesService.updateStateRegional(id, regional.id)
      })
    } catch (e) {
      throw new InternalServerError()
    }
  }

  async update(id: number, dto: UpdateStateRegionalDto, user: User) {
    const { regional } = await this.regionalService.findOne(id, false)

    validateAllowedRoles(rolesForTypeRegional[TypeRegionalEnum.ESTADUAL], user)

    if (dto?.name?.trim() && regional.name !== dto.name) {
      await this.regionalService.verifyExistsRegionalByNameAndStateAndType(
        dto.name,
        regional.stateId,
        TypeRegionalEnum.ESTADUAL,
      )
    }

    const name = dto?.name ?? regional.name

    try {
      await this.regionalRepository.update(regional.id, {
        name,
      })

      dto?.addCountiesIds?.map((id) => {
        return this.countiesService.updateStateRegional(id, regional.id)
      })

      dto?.removeCountiesIds?.map((id) => {
        return this.countiesService.updateStateRegional(id, null)
      })
    } catch (e) {
      throw new InternalServerError()
    }
  }
}
