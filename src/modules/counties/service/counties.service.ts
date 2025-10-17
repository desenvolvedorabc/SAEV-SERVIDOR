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
import { School } from 'src/modules/school/model/entities/school.entity'
import { TypeSchoolEnum } from 'src/modules/school/model/enum/type-school.enum'
import { StatesService } from 'src/modules/states/states.service'
import { User } from 'src/modules/user/model/entities/user.entity'
import { RoleProfile } from 'src/shared/enums/role.enum'
import { InternalServerError } from 'src/utils/errors'
import {
  formatParamsByProfile,
  typeSchoolForRole,
} from 'src/utils/format-params-by-profile'
import { paginateData } from 'src/utils/paginate-data'
import { validateAllowedRoles } from 'src/utils/validate-allowed-roles'
import { Connection, In, IsNull, Not, Repository } from 'typeorm'

import { editFileName } from '../../../helpers/utils'
import { Student } from '../../student/model/entities/student.entity'
import { Teacher } from '../../teacher/model/entities/teacher.entity'
import { CreateCountyDto } from '../model/dto/create-county.dto'
import { UpdateCountyDto } from '../model/dto/update-county.dto'
import { County } from '../model/entities/county.entity'
import { ICounty } from '../model/interface/county.interface'

@Injectable()
export class CountiesService {
  constructor(
    @InjectRepository(County)
    private countyRepository: Repository<County>,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectConnection()
    private readonly connection: Connection,

    private assessmentService: AssessmentsService,
    private statesService: StatesService,
  ) {}

  async paginate(
    paginateParams: PaginationParams,
    user: User,
  ): Promise<Pagination<County>> {
    const {
      page,
      limit,
      search,
      column,
      active,
      stateId,
      order,
      status,
      verifyExistsRegional,
      isEpvPartner,
      stateRegionalId,
      isCsv,
      county,
    } = formatParamsByProfile(paginateParams, user, true)

    const queryBuilder = this.countyRepository
      .createQueryBuilder('Counties')
      .orderBy(`Counties.${column || 'MUN_NOME'}`, order)

    if (county) {
      queryBuilder.andWhere('Counties.MUN_ID = :countyId', {
        countyId: county,
      })
    }

    if (status) {
      queryBuilder.andWhere('Counties.MUN_STATUS = :status', { status })
    }

    if (search) {
      queryBuilder.where('Counties.MUN_NOME LIKE :q', { q: `%${search}%` })
    }

    if (verifyExistsRegional) {
      queryBuilder.andWhere('Counties.stateRegionalId IS NULL')
    }

    if (active !== null) {
      queryBuilder.andWhere('Counties.MUN_ATIVO = :active', { active })
    }

    if (isEpvPartner) {
      queryBuilder.andWhere('Counties.MUN_PARCEIRO_EPV = :isEpvPartner', {
        isEpvPartner,
      })
    }

    if (stateId) {
      queryBuilder.andWhere('Counties.stateId = :stateId', {
        stateId,
      })
    }

    if (stateRegionalId) {
      queryBuilder.andWhere('Counties.stateRegionalId = :stateRegionalId', {
        stateRegionalId,
      })
    }

    return await paginateData(page, limit, queryBuilder, isCsv)
  }

  async getCountiesReport(paginateParams: PaginationParams, user: User) {
    const { typeSchool } = formatParamsByProfile(paginateParams, user, true)

    const data = await this.paginate(paginateParams, user)

    const calcStudentsByMun = await Promise.all(
      data.items.map(async (data) => {
        const { totalStudents, totalGrouped, totalSchools } =
          await this.getTotalStudentsAndGroupedAndSchoolsByCounty(
            data.MUN_ID,
            typeSchool,
          )

        return {
          MUN_ID: data.MUN_ID,
          MUN_COD_IBGE: data.MUN_COD_IBGE,
          MUN_NOME: data.MUN_NOME,
          MUN_UF: data.MUN_UF,
          MUN_STATUS: data.MUN_STATUS,
          MUN_ATIVO: data.MUN_ATIVO,
          TOTAL_ESCOLAS: totalSchools,
          TOTAL_ALUNOS: totalStudents,
          ENTURMADOS: totalGrouped
            ? Math.round((totalGrouped / totalStudents) * 100)
            : 0,
        }
      }),
    )

    return {
      ...data,
      items: calcStudentsByMun,
    }
  }

  async create(createCountyDto: CreateCountyDto, user: User): Promise<void> {
    const { state } = await this.statesService.findOne(createCountyDto.stateId)

    validateAllowedRoles([RoleProfile.SAEV, RoleProfile.ESTADO], user)

    await this.verifyCountyExists(createCountyDto)

    const county = this.countyRepository.create({
      ...createCountyDto,
      stateId: state.id,
    })

    try {
      await this.countyRepository.save(county, {
        data: user,
      })
    } catch (e) {
      throw new InternalServerError()
    }
  }

  async findAll(user: User): Promise<ICounty[]> {
    const fakeParams = {
      active: 1,
      isCsv: true,
    } as any

    const data = await this.paginate(fakeParams, user)

    return data?.items
  }

  async findOneReport(id: number, user: User) {
    const county = await this.findOne(id)

    const type = typeSchoolForRole[user?.USU_SPE?.role]

    const totalTeachers = await this.connection
      .getRepository(Teacher)
      .count({ where: { PRO_MUN: { MUN_ID: county.MUN_ID } } })

    const totalUsers = await this.connection
      .getRepository(User)
      .count({ where: { USU_MUN: { MUN_ID: county.MUN_ID } } })

    const { totalStudents, totalGrouped, totalSchools } =
      await this.getTotalStudentsAndGroupedAndSchoolsByCounty(id, type)

    const totalTests = await this.assessmentService.getTests(null, id)

    return {
      ...county,
      TOTAL_PROFESSORES: totalTeachers,
      TOTAL_USUARIOS: totalUsers,
      TOTAL_ALUNOS: totalStudents,
      TOTAL_ESCOLAS: totalSchools,
      totalTests,
      ENTURMADOS: totalGrouped
        ? Math.round((totalGrouped / totalStudents) * 100)
        : 0,
      INFREQUENCIA: 0,
    }
  }

  async findOne(id: number): Promise<County> {
    const county = await this.countyRepository.findOne({
      where: {
        MUN_ID: id,
      },
    })

    if (!county) {
      throw new NotFoundException('Município não encontrado.')
    }

    return county
  }

  async update(
    id: number,
    updateCountyDto: UpdateCountyDto,
    user: User,
  ): Promise<ICounty> {
    const county = await this.findOne(id)

    if (updateCountyDto.stateId && county.stateId !== updateCountyDto.stateId) {
      await this.statesService.findOne(updateCountyDto.stateId)
    }

    validateAllowedRoles(
      [
        RoleProfile.SAEV,
        RoleProfile.ESTADO,
        RoleProfile.MUNICIPIO_ESTADUAL,
        RoleProfile.MUNICIPIO_MUNICIPAL,
      ],
      user,
    )

    try {
      const countyUpdate = await this.countyRepository.save(
        { ...updateCountyDto, MUN_ID: county.MUN_ID },
        { data: user },
      )

      if (!countyUpdate.MUN_ATIVO) {
        this.disableUsersByCounty(county?.MUN_ID)
      }

      return countyUpdate
    } catch (e) {
      throw new InternalServerError()
    }
  }

  async changeShareData(id: number, user: User): Promise<void> {
    const county = await this.findOne(id)

    validateAllowedRoles([RoleProfile.MUNICIPIO_MUNICIPAL], user)

    try {
      await this.countyRepository.update(county.MUN_ID, {
        MUN_COMPARTILHAR_DADOS: !county.MUN_COMPARTILHAR_DADOS,
      })
    } catch (e) {
      throw new InternalServerError()
    }
  }

  async disableUsersByCounty(idCounty: number): Promise<void> {
    const users = await this.userRepository.find({
      where: {
        USU_MUN: {
          MUN_ID: idCounty,
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

  /**
   *
   * @param id informação referente a identificação do município
   * @param filename nome do arquivo salvo
   * @returns informa que o município foi atualizado
   */
  async updateFile(
    MUN_ID: number,
    filename: string,
    base64: string,
    user: User,
  ): Promise<string> {
    const county = await this.countyRepository.findOne({ MUN_ID })
    const folderName = './public/county/file/'
    const newFileName = editFileName(filename)
    if (county) {
      county.MUN_ARQ_CONVENIO = newFileName
      writeFileSync(`${folderName}${newFileName}`, base64, {
        encoding: 'base64',
      })
      await this.update(MUN_ID, county, user)
      return newFileName
    } else {
      throw new HttpException(
        'Não é possível gravar esta imagem.',
        HttpStatus.BAD_GATEWAY,
      )
    }
  }

  /**
   *
   * @param id informação referente a identificação do município
   * @param filename nome do arquivo salvo
   * @returns informa que o município foi atualizado
   */
  async updateAvatar(
    MUN_ID: number,
    filename: string,
    base64: string,
    user: User,
  ): Promise<string> {
    const county = await this.countyRepository.findOne({ MUN_ID })
    const folderName = './public/county/avatar/'
    const newFileName = editFileName(filename)
    if (county) {
      county.MUN_LOGO = newFileName
      writeFileSync(`${folderName}${newFileName}`, base64, {
        encoding: 'base64',
      })
      await this.update(MUN_ID, county, user)
      return newFileName
    } else {
      throw new HttpException(
        'Não é possível gravar esta imagem.',
        HttpStatus.BAD_GATEWAY,
      )
    }
  }

  async verifyCountyExists({
    MUN_NOME,
    MUN_UF,
    MUN_CIDADE,
  }: CreateCountyDto): Promise<void> {
    const county = await this.countyRepository.findOne({
      MUN_NOME,
      MUN_UF,
      MUN_CIDADE,
    })

    if (county) {
      throw new ConflictException('Município já cadastrado.')
    }
  }

  /**
   * Retorna todos os teste por ano
   *
   * @returns retorna uma lista de teste
   */
  findDistrict(uf: string, user: User): Promise<County[]> {
    if (user.USU_SPE.SPE_PER.PER_NOME !== 'SAEV') {
      return this.countyRepository.find({
        order: { MUN_UF: 'ASC' },
        where: { MUN_UF: uf, MUN_ID: user?.USU_MUN?.MUN_ID },
      })
    }

    return this.countyRepository.find({
      order: { MUN_UF: 'ASC' },
      where: { MUN_UF: uf },
    })
  }

  private async getTotalStudentsAndGroupedAndSchoolsByCounty(
    countyId: number,
    typeSchool: TypeSchoolEnum,
  ) {
    const schools = await this.connection.getRepository(School).find({
      where: {
        ESC_MUN: {
          MUN_ID: countyId,
        },
        ESC_TIPO: typeSchool || Not(IsNull()),
      },
      select: ['ESC_ID'],
    })

    const [totalStudents, totalGrouped] = await Promise.all([
      await this.connection.getRepository(Student).count({
        where: {
          ALU_ESC: {
            ESC_ID: In(schools.map((school) => school.ESC_ID)),
          },
          ALU_ATIVO: true,
        },
      }),
      await this.connection.getRepository(Student).count({
        where: {
          ALU_ESC: {
            ESC_ID: In(schools.map((school) => school.ESC_ID)),
          },
          ALU_TUR: Not(IsNull()),
          ALU_ATIVO: true,
        },
      }),
    ])

    return {
      totalStudents,
      totalGrouped,
      totalSchools: schools.length,
    }
  }

  async updateStateRegional(id: number, stateRegionalId: number | null) {
    await this.countyRepository.update(id, {
      stateRegionalId,
    })
  }
}
