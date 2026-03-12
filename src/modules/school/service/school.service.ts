import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectConnection, InjectRepository } from '@nestjs/typeorm'
import { writeFileSync } from 'fs'
import { Pagination } from 'nestjs-typeorm-paginate'
import { PaginationParams } from 'src/helpers/params'
import { AssessmentsService } from 'src/modules/assessment/service/assessment.service'
import { User } from 'src/modules/user/model/entities/user.entity'
import { RoleProfile } from 'src/shared/enums/role.enum'
import { InternalServerError } from 'src/utils/errors'
import { formatParamsByProfile } from 'src/utils/format-params-by-profile'
import { paginateData } from 'src/utils/paginate-data'
import { validateAllowedRoles } from 'src/utils/validate-allowed-roles'
import { Connection, IsNull, Not, Repository } from 'typeorm'

import { editFileName } from '../../../helpers/utils'
import { Student } from '../../student/model/entities/student.entity'
import { CreateSchoolDto } from '../model/dto/create-school.dto'
import { UpdateSchoolDto } from '../model/dto/update-school.dto'
import { School } from '../model/entities/school.entity'
import { TypeSchoolEnum } from '../model/enum/type-school.enum'

const rolesForTypeSchool = {
  [TypeSchoolEnum.MUNICIPAL]: [
    RoleProfile.SAEV,
    RoleProfile.MUNICIPIO_MUNICIPAL,
  ],
  [TypeSchoolEnum.ESTADUAL]: [
    RoleProfile.SAEV,
    RoleProfile.ESTADO,
    RoleProfile.MUNICIPIO_ESTADUAL,
  ],
}

@Injectable()
export class SchoolService {
  constructor(
    @InjectRepository(School)
    private schoolRepository: Repository<School>,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectConnection()
    private connection: Connection,

    private assessmentService: AssessmentsService,
  ) {}

  async paginate(
    paginationParams: PaginationParams,
    user: User,
  ): Promise<Pagination<School>> {
    const {
      page,
      limit,
      search,
      order,
      active,
      status,
      county,
      typeSchool,
      verifyExistsRegional,
      municipalityOrUniqueRegionalId,
      stateId,
      isCsv,
      school,
    } = formatParamsByProfile(paginationParams, user, true)

    const queryBuilder = this.schoolRepository
      .createQueryBuilder('School')
      .select([
        'School',
        'ESC_MUN.MUN_ID',
        'ESC_MUN.MUN_NOME',
        'ESC_MUN.MUN_UF',
      ])
      .innerJoin('School.ESC_MUN', 'ESC_MUN')
      .orderBy('School.ESC_NOME', order)

    if (status) {
      queryBuilder.andWhere('School.ESC_STATUS = :status', { status })
    }

    if (school) {
      queryBuilder.andWhere('School.ESC_ID = :schoolId', {
        schoolId: school,
      })
    }

    const effectiveTypeSchool =
      typeSchool ??
      (user?.USU_SPE?.role === RoleProfile.ESTADO
        ? TypeSchoolEnum.ESTADUAL
        : null)

    if (effectiveTypeSchool) {
      queryBuilder.andWhere('School.ESC_TIPO = :typeSchool', {
        typeSchool: effectiveTypeSchool,
      })
    }

    if (county) {
      queryBuilder.andWhere('ESC_MUN.MUN_ID = :countyId', { countyId: county })
    }

    if (stateId) {
      queryBuilder.andWhere('ESC_MUN.stateId = :stateId', { stateId })
    }

    if (municipalityOrUniqueRegionalId) {
      queryBuilder.andWhere('School.regionalId = :regionalId', {
        regionalId: municipalityOrUniqueRegionalId,
      })
    }

    if (verifyExistsRegional) {
      queryBuilder.andWhere('School.regionalId IS NULL')
    }

    if (active !== null) {
      queryBuilder.andWhere('School.ESC_ATIVO = :active', { active })
    }

    if (search) {
      queryBuilder.andWhere('School.ESC_NOME like :search', {
        search: `%${search}%`,
      })
    }

    return await paginateData(page, limit, queryBuilder, isCsv)
  }

  async getSchoolsReport(paginationParams: PaginationParams, user: User) {
    const data = await this.paginate(paginationParams, user)

    const formattedData = await Promise.all(
      data.items.map(async (school) => {
        const [{ totalStudents }, { totalGrouped }] = await Promise.all([
          await this.getTotalStudentsBySchool(school.ESC_ID),
          await this.getTotalGroupedBySchool(school.ESC_ID),
        ])

        return {
          ESC_ID: school.ESC_ID,
          ESC_NOME: school.ESC_NOME,
          ESC_TIPO: school.ESC_TIPO,
          ESC_MUN: `${school.ESC_MUN.MUN_NOME} - ${school.ESC_MUN.MUN_UF}`,
          ESC_INEP: school.ESC_INEP,
          ESC_ATIVO: school.ESC_ATIVO,
          ESC_STATUS: school.ESC_STATUS,
          ENTURMADOS: totalStudents
            ? Math.round((totalGrouped / totalStudents) * 100)
            : 0,
          INFREQUENCIA: 0,
        }
      }),
    )

    return {
      ...data,
      items: formattedData,
    }
  }

  async create(createSchoolDto: CreateSchoolDto, user: User) {
    validateAllowedRoles(rolesForTypeSchool[createSchoolDto.ESC_TIPO], user)

    await this.verifySchoolExists(createSchoolDto)

    const school = this.schoolRepository.create(createSchoolDto)
    try {
      return await this.schoolRepository.save(school, { data: user })
    } catch (e) {
      throw new InternalServerError()
    }
  }

  async findAll(user: User) {
    const paramsFake = {
      isCsv: true,
      county: null,
      active: 1,
    } as any

    const data = await this.paginate(paramsFake, user)

    return data?.items
  }

  async findAllTransfer(user: User) {
    const paramsFake = {
      isCsv: true,
      county: null,
      active: 1,
    } as any

    const data = await this.findByTransfer(paramsFake, user)

    return data?.items
  }

  async findOneReport(id: string) {
    const school = await this.findOne(+id, ['ESC_TUR', 'ESC_TUR.TUR_SER'])

    const { totalUsers } = await this.getTotalUsersBySchool(school.ESC_ID)

    const { totalStudents } = await this.getTotalStudentsBySchool(school.ESC_ID)

    const { totalGrouped } = await this.getTotalGroupedBySchool(school.ESC_ID)

    const totalTests = await this.assessmentService.getTests(id)

    const series = school?.ESC_TUR?.map((data) => data?.TUR_SER?.SER_ID).filter(
      (value, index, self) => index === self.findIndex((t) => value === t),
    )

    return {
      ESC_ID: school.ESC_ID,
      ESC_NOME: school.ESC_NOME,
      TOTAL_ENTURMADO: totalGrouped,
      TOTAL_ALUNOS: totalStudents,
      TOTAL_USUARIOS: totalUsers,
      totalTests,
      ENTURMADOS: totalGrouped
        ? Math.round((totalGrouped / totalStudents) * 100)
        : 0,
      SERIES: series?.length,
      INFREQUENCIA: 0,
    }
  }

  async findOne(id: number, relations = []): Promise<School> {
    const school = await this.schoolRepository.findOne({
      where: {
        ESC_ID: id,
      },
      relations,
    })

    if (!school) {
      throw new NotFoundException('Escola não encontrada')
    }

    return school
  }

  async disableUsersBySchool(id: number): Promise<void> {
    const users = await this.userRepository.find({
      where: {
        USU_ESC: {
          ESC_ID: id,
        },
      },
    })

    for (const user of users) {
      if (user.USU_ATIVO) {
        await this.userRepository.save({
          ...user,
          USU_ATIVO: false,
        })
      }
    }
  }

  async findByTransfer(params: PaginationParams, user: User) {
    const { typeSchool, isDestination } = params
    const { page, limit, active, search, isCsv } = formatParamsByProfile(
      params,
      user,
      true,
      true,
    )
    const queryBuilder = this.schoolRepository
      .createQueryBuilder('School')
      .select([
        'School.ESC_ID',
        'School.ESC_NOME',
        'School.ESC_TIPO',
        'School.ESC_UF',
        'county.MUN_ID',
        'county.MUN_NOME',
        'county.MUN_UF',
        'state.id',
        'state.name',
      ])
      .innerJoin('School.ESC_MUN', 'county')
      .innerJoin('county.state', 'state')
      .orderBy('School.ESC_NOME', 'ASC')

    const userRole = user?.USU_SPE?.role

    if (typeSchool) {
      queryBuilder.andWhere('School.ESC_TIPO = :typeSchool', {
        typeSchool,
      })
    } else if (!isDestination && userRole === RoleProfile.ESTADO) {
      queryBuilder.andWhere('School.ESC_TIPO = :typeSchool', {
        typeSchool: TypeSchoolEnum.ESTADUAL,
      })
    }

    if ([RoleProfile.ESCOLA].includes(userRole)) {
      queryBuilder.andWhere('county.MUN_ID = :countyId', {
        countyId: user?.USU_MUN?.MUN_ID,
      })
    }

    if (isDestination) {
      if (userRole === RoleProfile.ESCOLA) {
        queryBuilder.andWhere('county.MUN_ID = :countyId', {
          countyId: user?.USU_MUN?.MUN_ID,
        })
        queryBuilder.andWhere('School.ESC_ID = :schoolId', {
          schoolId: user?.USU_ESC?.ESC_ID,
        })
      } else if (userRole === RoleProfile.MUNICIPIO_MUNICIPAL) {
        queryBuilder.andWhere('county.MUN_ID = :countyId', {
          countyId: user?.USU_MUN?.MUN_ID,
        })
        queryBuilder.andWhere('School.ESC_TIPO = :typeSchool', {
          typeSchool: TypeSchoolEnum.MUNICIPAL,
        })
      } else if (userRole === RoleProfile.MUNICIPIO_ESTADUAL) {
        queryBuilder.andWhere('county.MUN_ID = :countyId', {
          countyId: user?.USU_MUN?.MUN_ID,
        })
        queryBuilder.andWhere('School.ESC_TIPO = :typeSchool', {
          typeSchool: TypeSchoolEnum.ESTADUAL,
        })
      } else if (userRole === RoleProfile.ESTADO) {
        queryBuilder.andWhere('county.stateId = :stateId', {
          stateId: user?.stateId,
        })
      }
    }

    if (active !== null) {
      queryBuilder.andWhere('School.ESC_ATIVO = :active', { active })
    }

    if (search?.trim()) {
      queryBuilder.andWhere('School.ESC_NOME like :search', {
        search: `%${search}%`,
      })
    }

    return await paginateData(page, limit, queryBuilder, isCsv)
  }

  async findAllByCounty(countyId: number, user: User) {
    const paramsFake = {
      isCsv: true,
      county: countyId,
      active: 1,
    } as any

    const data = await this.paginate(paramsFake, user)

    return data?.items
  }

  async update(id: number, updateSchoolDto: UpdateSchoolDto, user: User) {
    const school = await this.findOne(id)
    let regionalId = school.regionalId

    validateAllowedRoles(rolesForTypeSchool[school.ESC_TIPO], user)

    if (
      updateSchoolDto.ESC_INEP?.trim() &&
      updateSchoolDto.ESC_INEP !== school.ESC_INEP
    ) {
      await this.validateExistsByInep(updateSchoolDto.ESC_INEP)
    }

    if (
      updateSchoolDto?.ESC_TIPO?.trim() &&
      updateSchoolDto?.ESC_TIPO !== school?.ESC_TIPO
    ) {
      regionalId = null
    }

    try {
      const schoolUpdate = await this.schoolRepository.save(
        { ...updateSchoolDto, regionalId, ESC_ID: school.ESC_ID },
        { data: user },
      )

      if (!updateSchoolDto.ESC_ATIVO) {
        this.disableUsersBySchool(school.ESC_ID)
      }

      return schoolUpdate
    } catch (e) {
      throw new InternalServerError()
    }
  }

  /**
   *
   * @param id informação referente a identificação do escola
   * @param filename nome do arquivo salvo
   * @returns informa que o escola foi atualizada
   */
  async updateAvatar(
    ESC_ID: number,
    filename: string,
    base64: string,
    user: User,
  ): Promise<string> {
    const school = await this.schoolRepository.findOne({ ESC_ID })
    const folderName = './public/school/avatar/'
    const newFileName = editFileName(filename)
    if (school) {
      school.ESC_LOGO = newFileName
      writeFileSync(`${folderName}${newFileName}`, base64, {
        encoding: 'base64',
      })
      await this.update(ESC_ID, school, user)
      return newFileName
    } else {
      throw new HttpException(
        'Não é possível gravar esta imagem.',
        HttpStatus.BAD_GATEWAY,
      )
    }
  }

  private async verifySchoolExists({
    ESC_NOME,
    ESC_UF,
    ESC_CIDADE,
    ESC_INEP,
  }: CreateSchoolDto): Promise<void> {
    const school = await this.schoolRepository.findOne({
      where: {
        ESC_NOME,
        ESC_UF,
        ESC_CIDADE,
      },
    })

    if (school) {
      throw new ConflictException('Escola já cadastrada')
    }

    await this.validateExistsByInep(ESC_INEP)
  }

  private async validateExistsByInep(inep: string) {
    const school = await this.schoolRepository.findOne({
      where: {
        ESC_INEP: inep,
      },
    })

    if (school) {
      throw new ConflictException('Escola já cadastrada com esse INEP.')
    }
  }

  private async getTotalUsersBySchool(id: number) {
    const totalUsers = await this.connection
      .getRepository(User)
      .count({ where: { USU_ESC: { ESC_ID: id } } })

    return {
      totalUsers,
    }
  }

  async updateRegional(id: number, regionalId: number | null) {
    await this.schoolRepository.update(id, {
      regionalId,
    })
  }

  private async getTotalGroupedBySchool(schoolId: number) {
    const totalGrouped = await this.connection.getRepository(Student).count({
      where: {
        ALU_ESC: {
          ESC_ID: schoolId,
        },
        ALU_TUR: Not(IsNull()),
        ALU_ATIVO: true,
      },
    })

    return {
      totalGrouped,
    }
  }

  private async getTotalStudentsBySchool(schoolId: number) {
    const totalStudents = await this.connection.getRepository(Student).count({
      where: {
        ALU_ESC: {
          ESC_ID: schoolId,
        },
        ALU_ATIVO: true,
      },
    })

    return {
      totalStudents,
    }
  }
}
