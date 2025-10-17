import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Parser } from 'json2csv'
import { RoleProfile } from 'src/shared/enums/role.enum'
import { paginateData } from 'src/utils/paginate-data'
import { Repository } from 'typeorm'

import { TypeSchoolEnum } from '../school/model/enum/type-school.enum'
import { User } from '../user/model/entities/user.entity'
import { PaginateParamsRegional } from './model/dto/pagination-params-regional.dto'
import { Regional } from './model/entities/regional.entity'
import { TypeRegionalEnum } from './model/enum/type-regional.enum'

@Injectable()
export class RegionalService {
  constructor(
    @InjectRepository(Regional)
    private regionalRepository: Repository<Regional>,
  ) {}

  async findAll(
    {
      page,
      limit,
      stateId,
      county,
      search,
      order,
      isCsv,
      type,
    }: PaginateParamsRegional,
    user: User,
  ) {
    const queryBuilder = this.regionalRepository
      .createQueryBuilder('Regional')
      .select('Regional.id')
      .orderBy('Regional.name', order)

    if (type) {
      queryBuilder.andWhere('Regional.type = :type', {
        type,
      })
    }

    if (stateId) {
      queryBuilder.andWhere('Regional.stateId = :stateId', {
        stateId,
      })
    }

    if (county) {
      queryBuilder.andWhere('Regional.countyId = :countyId', {
        countyId: county,
      })
    }

    if (user?.USU_SPE?.role !== RoleProfile.SAEV) {
      queryBuilder.andWhere('Regional.stateId = :stateId', {
        stateId: user?.stateId,
      })

      if (user.USU_SPE.role !== RoleProfile.ESTADO) {
        queryBuilder.andWhere('Regional.countyId = :countyId', {
          countyId: user?.USU_MUN?.MUN_ID,
        })
      }
    }

    if (search) {
      queryBuilder.andWhere('Regional.name LIKE :search', {
        search: `%${search}%`,
      })
    }

    const data = await paginateData(page, limit, queryBuilder, isCsv)

    const formatData = await Promise.all(
      data.items.map(async (item) => {
        const { regional } = await this.findOne(item.id)

        return {
          ...regional,
        }
      }),
    )

    return {
      ...data,
      items: formatData,
    }
  }

  async findAllForFilter(
    {
      page,
      limit,
      stateId,
      county,
      search,
      type,
      typeSchool,
      order,
      countQueries,
      verifyProfileForState,
    }: PaginateParamsRegional,
    user: User,
  ) {
    const queryBuilder = this.regionalRepository
      .createQueryBuilder('Regional')
      .select(['Regional.id', 'Regional.name'])
      .leftJoin('Regional.counties', 'counties')
      .leftJoin('Regional.schools', 'schools')
      .orderBy('Regional.name', order)

    if (!countQueries) {
      queryBuilder.addSelect([
        'counties.MUN_ID',
        'counties.MUN_NOME',
        'schools.ESC_ID',
        'schools.ESC_NOME',
      ])
    }

    if (type) {
      queryBuilder.andWhere('Regional.type = :type', {
        type,
      })
    }

    if (stateId) {
      queryBuilder.andWhere('Regional.stateId = :stateId', {
        stateId,
      })
    }

    if (county) {
      queryBuilder
        .innerJoin('Regional.county', 'county')
        .andWhere('Regional.countyId = :countyId', {
          countyId: county,
        })

      if (verifyProfileForState && typeSchool === TypeSchoolEnum.MUNICIPAL) {
        queryBuilder.andWhere('county.MUN_COMPARTILHAR_DADOS IS TRUE')
      }
    }

    if (user?.USU_SPE?.role !== RoleProfile.SAEV) {
      queryBuilder.andWhere('Regional.stateId = :stateId', {
        stateId: user?.stateId,
      })
    }

    if (!county) {
      if (
        [RoleProfile.ESTADO].includes(user.USU_SPE.role) &&
        typeSchool === TypeSchoolEnum.MUNICIPAL
      ) {
        queryBuilder.andWhere('counties.MUN_COMPARTILHAR_DADOS IS TRUE')
      }

      if (
        [
          RoleProfile.MUNICIPIO_ESTADUAL,
          RoleProfile.MUNICIPIO_MUNICIPAL,
        ].includes(user?.USU_SPE?.role)
      ) {
        queryBuilder.andWhere(
          'Regional.id = :id and counties.MUN_ID = :countyId',
          {
            id: user?.USU_MUN?.stateRegionalId,
            countyId: user?.USU_MUN?.MUN_ID,
          },
        )
      }
    }

    if (user.USU_SPE.role === RoleProfile.ESCOLA) {
      queryBuilder.andWhere(
        '((Regional.id = :stateRegionalId and counties.MUN_ID = :countyId) or (Regional.id = :municipalityRegionalId and schools.ESC_ID = :schoolId))',
        {
          stateRegionalId: user?.USU_MUN?.stateRegionalId,
          municipalityRegionalId: user?.USU_ESC?.regionalId,
          countyId: user?.USU_MUN?.MUN_ID,
          schoolId: user?.USU_ESC?.ESC_ID,
        },
      )
    }

    if (search) {
      queryBuilder.andWhere('Regional.name LIKE :search', {
        search: `%${search}%`,
      })
    }

    return await paginateData(page, limit, queryBuilder, false, countQueries)
  }

  async verifyExistsRegionalByNameAndStateAndType(
    name: string,
    stateId: number,
    type: TypeRegionalEnum,
  ): Promise<void> {
    const regional = await this.regionalRepository.findOne({
      name,
      stateId,
      type,
    })

    if (regional) {
      throw new ConflictException('Já existe uma regional com esse nome.')
    }
  }

  async findOne(id: number, relations: boolean = true) {
    const queryBuilder = this.regionalRepository
      .createQueryBuilder('Regional')
      .where('Regional.id = :id', { id })

    if (relations) {
      queryBuilder
        .addSelect(['state.id', 'state.name'])
        .addSelect(['county.MUN_ID', 'county.MUN_NOME'])
        .addSelect(['counties.MUN_ID', 'counties.MUN_NOME'])
        .addSelect(['schools.ESC_ID', 'schools.ESC_NOME'])
        .leftJoin('Regional.counties', 'counties')
        .leftJoin('Regional.schools', 'schools')
        .leftJoin('Regional.state', 'state')
        .leftJoin('Regional.county', 'county')
    }

    const regional = await queryBuilder.getOne()

    if (!regional) {
      throw new NotFoundException('Regional não encontrada.')
    }

    return {
      regional,
    }
  }

  async generateCsv(dto: PaginateParamsRegional, user: User) {
    const data = await this.findAll(
      {
        ...dto,
        isCsv: true,
      },
      user,
    )

    const formattedData = data?.items.map((item) => {
      if (dto.type === TypeRegionalEnum.ESTADUAL) {
        return {
          nome_regional: item.name,
          estado: item?.state?.name,
          tipo: item.type,
          municipios: item?.counties
            ?.map((county) => county.MUN_NOME)
            .join(', '),
        }
      }

      return {
        nome_regional: item.name,
        estado: item?.state?.name,
        municipio: item?.county?.MUN_NOME,
        tipo: item.type,
        escolas: item?.schools?.map((school) => school.ESC_NOME).join(', '),
      }
    })

    if (!formattedData?.length) {
      formattedData.push({} as any)
    }

    const parser = new Parser({
      quote: ' ',
      withBOM: true,
    })

    try {
      const csv = parser.parse(formattedData)
      return csv
    } catch (error) {
      console.log('error csv:', error.message)
    }
  }
}
