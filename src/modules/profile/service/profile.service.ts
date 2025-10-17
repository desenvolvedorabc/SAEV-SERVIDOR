import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { PaginationParams } from 'src/helpers/params'
import { User } from 'src/modules/user/model/entities/user.entity'
import { InternalServerError } from 'src/utils/errors'
import { paginateData } from 'src/utils/paginate-data'
import { Connection, Repository } from 'typeorm'

import { CreateSubProfileDto } from '../model/dto/CreateSubProfileDto'
import { UpdateSubProfileDto } from '../model/dto/UpdateSubProfileDto'
import { SubProfile } from '../model/entities/sub-profile.entity'

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(SubProfile)
    private subProfileRepository: Repository<SubProfile>,
  ) {}

  async findOne(id: number, relations: string[] = ['AREAS']) {
    const subProfile = await this.subProfileRepository.findOne(
      { SPE_ID: id },
      { relations },
    )

    if (!subProfile) {
      throw new NotFoundException()
    }

    return subProfile
  }

  async paginate({
    page,
    limit,
    search,
    active,
    order,
    column,
    roleProfile,
  }: PaginationParams) {
    const queryBuilder = this.subProfileRepository
      .createQueryBuilder('SubPerfil')
      .select(['SubPerfil.SPE_ID', 'SubPerfil.SPE_NOME', 'SubPerfil.role'])
      .orderBy(`SubPerfil.${column ?? 'SPE_NOME'}`, order)

    if (search) {
      queryBuilder.where('SubPerfil.SPE_NOME LIKE :q', { q: `%${search}%` })
    }

    if (active) {
      queryBuilder.andWhere('SubPerfil.SPE_ATIVO = :active', { active })
    }

    if (roleProfile) {
      queryBuilder.andWhere('SubPerfil.role = :roleProfile', { roleProfile })
    }

    const data = await paginateData(+page, +limit, queryBuilder)

    const getAreasByProfile = await Promise.all(
      data.items.map(async (profile) => {
        const { AREAS } = await this.findOne(profile.SPE_ID, ['AREAS'])

        return {
          ...profile,
          AREAS,
        }
      }),
    )

    return {
      ...data,
      items: getAreasByProfile,
    }
  }

  async update(
    id: number,
    updateSubProfileDto: UpdateSubProfileDto,
    user: User,
  ) {
    const subProfile = await this.findOne(id)
    // TODO: Validar perfil existe

    try {
      return this.subProfileRepository.save(
        {
          ...updateSubProfileDto,
          SPE_ID: id,
        },
        { data: user },
      )
    } catch (e) {
      throw new InternalServerError()
    }
  }

  async exists({ SPE_NOME, role }: CreateSubProfileDto) {
    const subProfile = await this.subProfileRepository.findOne({
      SPE_NOME,
      role,
    })

    if (subProfile) {
      throw new ConflictException('Já existe um perfil com esse nome.')
    }
  }

  async create(createSubProfileDto: CreateSubProfileDto, user: User) {
    await this.exists(createSubProfileDto)

    const profile = this.subProfileRepository.create(createSubProfileDto)
    try {
      return await this.subProfileRepository.save(profile, {
        data: user,
      })
    } catch (e) {
      throw new InternalServerError()
    }
  }
}
