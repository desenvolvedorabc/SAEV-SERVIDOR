import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { RoleProfile } from 'src/shared/enums/role.enum'
import { areasFilter } from 'src/utils/areas-filter'
import { Repository } from 'typeorm'

import { Area } from '../model/entities/area.entity'
import { IArea } from '../model/interface/area.interface'

@Injectable()
export class AreaService {
  constructor(
    @InjectRepository(Area)
    private areaRepository: Repository<Area>,
  ) {}

  findAll(): Promise<IArea[]> {
    return this.areaRepository.find({ order: { ARE_NOME: 'ASC' } })
  }

  async findByProfile(role: RoleProfile) {
    const areas = await this.areaRepository.find({
      order: { ARE_NOME: 'ASC' },
    })
    const areasByPerfil = areasFilter[role] as string[]

    const areasFilterByPerfil: IArea[] = []

    areasByPerfil?.forEach((areaPerfil) => {
      areas?.forEach((area) => {
        if (area.ARE_NOME === areaPerfil) {
          areasFilterByPerfil.push(area)
        }
      })
    })

    return areasFilterByPerfil
  }

  findOne(ARE_ID: number): Promise<IArea> {
    return this.areaRepository.findOne({ ARE_ID })
  }

  async getManyByProfile(profileId: number) {}
}
