import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { CountiesService } from 'src/modules/counties/service/counties.service'
import { SchoolService } from 'src/modules/school/service/school.service'
import { StatesService } from 'src/modules/states/states.service'
import { User } from 'src/modules/user/model/entities/user.entity'
import { RoleProfile } from 'src/shared/enums/role.enum'
import { InternalServerError } from 'src/utils/errors'
import { validateAllowedRoles } from 'src/utils/validate-allowed-roles'
import { Repository } from 'typeorm'

import { CreateSingleRegionalDto } from '../model/dto/create-single-regional.dto'
import { UpdateSingleRegionalDto } from '../model/dto/update-single-regional.dto'
import { Regional } from '../model/entities/regional.entity'
import { TypeRegionalEnum } from '../model/enum/type-regional.enum'
import { RegionalService } from '../regional.service'

const rolesForTypeRegional = {
  [TypeRegionalEnum.UNICA]: [
    RoleProfile.SAEV,
    RoleProfile.ESTADO,
    RoleProfile.MUNICIPIO_ESTADUAL,
  ],
}

@Injectable()
export class SingleRegionalService {
  constructor(
    @InjectRepository(Regional)
    private regionalRepository: Repository<Regional>,

    private readonly regionalService: RegionalService,

    private readonly statesService: StatesService,
    private readonly countiesService: CountiesService,
    private readonly schoolsService: SchoolService,
  ) {}

  async create(dto: CreateSingleRegionalDto, user: User): Promise<void> {
    validateAllowedRoles(rolesForTypeRegional[TypeRegionalEnum.UNICA], user)

    await this.statesService.findOne(dto.stateId)

    await this.regionalService.verifyExistsRegionalByNameAndStateAndType(
      dto.name,
      dto.stateId,
      TypeRegionalEnum.UNICA,
    )

    const regional = this.regionalRepository.create({
      name: dto.name,
      stateId: dto.stateId,
      countyId: dto.countyId,
      type: TypeRegionalEnum.UNICA,
    })

    try {
      await this.regionalRepository.save(regional, {
        data: user,
      })

      dto?.schoolsIds?.map((id) => {
        return this.schoolsService.updateRegional(id, regional.id)
      })
    } catch (e) {
      throw new InternalServerError()
    }
  }

  async update(
    id: number,
    dto: UpdateSingleRegionalDto,
    user: User,
  ): Promise<void> {
    const { regional } = await this.regionalService.findOne(id, false)

    validateAllowedRoles(rolesForTypeRegional[TypeRegionalEnum.UNICA], user)

    if (dto?.name?.trim() && regional.name !== dto.name) {
      await this.regionalService.verifyExistsRegionalByNameAndStateAndType(
        dto.name,
        regional.stateId,
        TypeRegionalEnum.UNICA,
      )
    }

    const name = dto?.name ?? regional.name

    try {
      await this.regionalRepository.update(regional.id, {
        name,
      })

      dto?.removeSchoolsIds?.map((id) => {
        return this.schoolsService.updateRegional(id, null)
      })

      dto?.addSchoolsIds?.map((id) => {
        return this.schoolsService.updateRegional(id, regional.id)
      })
    } catch (e) {
      throw new InternalServerError()
    }
  }
}
