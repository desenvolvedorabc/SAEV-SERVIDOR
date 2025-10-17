import { Injectable } from '@nestjs/common'
import { InjectConnection, InjectRepository } from '@nestjs/typeorm'
import { PaginationParams } from 'src/helpers/params'
import { County } from 'src/modules/counties/model/entities/county.entity'
import { TypeRegionalEnum } from 'src/modules/regional/model/enum/type-regional.enum'
import { RegionalService } from 'src/modules/regional/regional.service'
import { School } from 'src/modules/school/model/entities/school.entity'
import { TypeSchoolEnum } from 'src/modules/school/model/enum/type-school.enum'
import { SchoolClass } from 'src/modules/school-class/model/entities/school-class.entity'
import { Serie } from 'src/modules/serie/model/entities/serie.entity'
import { Student } from 'src/modules/student/model/entities/student.entity'
import { User } from 'src/modules/user/model/entities/user.entity'
import { paginateData } from 'src/utils/paginate-data'
import { Connection, Repository } from 'typeorm'

@Injectable()
export class ReportGroupingRepository {
  constructor(
    @InjectRepository(SchoolClass)
    private readonly schoolClassRepository: Repository<SchoolClass>,

    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,

    @InjectRepository(Serie)
    private readonly seriesClassRepository: Repository<Serie>,

    @InjectRepository(County)
    private readonly countyRepository: Repository<County>,

    @InjectConnection()
    private readonly connection: Connection,

    private readonly regionalService: RegionalService,
  ) {}

  private async getTotalStudentsGrouped({
    county,
    school,
    serie,
    schoolClass,
    typeSchool,
    municipalityOrUniqueRegionalId,
    stateRegionalId,
    stateId,
    verifyProfileForState,
  }: PaginationParams) {
    const queryBuilder = this.connection
      .getRepository(Student)
      .createQueryBuilder('Student')
      .innerJoin('Student.ALU_TUR', 'schoolClass')
      .innerJoin('Student.ALU_ESC', 'school', 'school.ESC_TIPO = :typeSchool', {
        typeSchool,
      })
      .innerJoin('school.ESC_MUN', 'county')
      .where('Student.ALU_ATIVO = TRUE')

    if (verifyProfileForState && typeSchool === TypeSchoolEnum.MUNICIPAL) {
      queryBuilder.andWhere('county.MUN_COMPARTILHAR_DADOS IS TRUE')
    }

    if (schoolClass) {
      queryBuilder.andWhere('schoolClass.TUR_ID = :schoolClass', {
        schoolClass,
      })
    }

    if (school) {
      queryBuilder.andWhere('schoolClass.TUR_ESC = :school', {
        school,
      })
    }

    if (serie) {
      queryBuilder.andWhere('schoolClass.TUR_SER = :serie', {
        serie,
      })
    } else if (municipalityOrUniqueRegionalId) {
      queryBuilder.andWhere(
        'school.regionalId = :municipalityOrUniqueRegionalId',
        {
          municipalityOrUniqueRegionalId,
        },
      )
    } else if (county) {
      queryBuilder.andWhere('county.MUN_ID = :county', {
        county,
      })
    } else if (stateRegionalId) {
      queryBuilder.andWhere('county.stateRegionalId = :stateRegionalId', {
        stateRegionalId,
      })
    } else if (stateId) {
      queryBuilder.andWhere('county.stateId = :stateId', {
        stateId,
      })
    }

    const totalGrouped = await queryBuilder.getCount()

    return {
      totalGrouped,
    }
  }

  async getTotalStudents(params: PaginationParams) {
    const {
      county,
      school,
      serie,
      typeSchool,
      municipalityOrUniqueRegionalId,
      stateRegionalId,
      stateId,
      verifyProfileForState,
    } = params
    const queryBuilder = this.connection
      .getRepository(Student)
      .createQueryBuilder('Student')
      .innerJoin('Student.ALU_ESC', 'school', 'school.ESC_TIPO = :typeSchool', {
        typeSchool,
      })
      .innerJoin('school.ESC_MUN', 'county')
      .where('Student.ALU_ATIVO = TRUE')

    if (verifyProfileForState && typeSchool === TypeSchoolEnum.MUNICIPAL) {
      queryBuilder.andWhere('county.MUN_COMPARTILHAR_DADOS IS TRUE')
    }

    if (serie) {
      queryBuilder.andWhere('Student.ALU_SER = :serie', {
        serie,
      })
    }

    if (school) {
      queryBuilder.andWhere('school.ESC_ID = :school', {
        school,
      })
    } else if (municipalityOrUniqueRegionalId) {
      queryBuilder.andWhere(
        'school.regionalId = :municipalityOrUniqueRegionalId',
        {
          municipalityOrUniqueRegionalId,
        },
      )
    } else if (county) {
      queryBuilder.andWhere('county.MUN_ID = :county', {
        county,
      })
    } else if (stateRegionalId) {
      queryBuilder.andWhere('county.stateRegionalId = :stateRegionalId', {
        stateRegionalId,
      })
    } else if (stateId) {
      queryBuilder.andWhere('county.stateId = :stateId', {
        stateId,
      })
    }

    const [totalStudents, { totalGrouped }] = await Promise.all([
      await queryBuilder.getCount(),
      await this.getTotalStudentsGrouped(params),
    ])

    const totalNotGrouped = totalStudents - totalGrouped

    return {
      totalStudents,
      totalGrouped,
      totalNotGrouped,
    }
  }

  async getGroupingBySchoolClass({
    page,
    limit,
    schoolClass,
    order,
    search,
    typeSchool,
    verifyProfileForState,
  }: PaginationParams) {
    const queryBuilder = this.connection
      .getRepository(Student)
      .createQueryBuilder('Student')
      .select([
        'Student.ALU_ID',
        'Student.ALU_NOME',
        'Student.ALU_CPF',
        'Student.ALU_NOME_MAE',
        'Student.ALU_DT_NASC',
      ])
      .where('Student.ALU_TUR = :schoolClass', { schoolClass })
      .innerJoin('Student.ALU_ESC', 'school', 'school.ESC_TIPO = :typeSchool', {
        typeSchool,
      })
      .innerJoin('school.ESC_MUN', 'county')
      .orderBy('Student.ALU_NOME', order)
      .andWhere('Student.ALU_ATIVO = true')

    if (verifyProfileForState && typeSchool === TypeSchoolEnum.MUNICIPAL) {
      queryBuilder.andWhere('county.MUN_COMPARTILHAR_DADOS IS TRUE')
    }

    if (search) {
      queryBuilder.andWhere('Student.ALU_NOME LIKE :search', {
        search: `%${search}%`,
      })
    }

    return await paginateData(+page, +limit, queryBuilder)
  }

  async getGroupingBySerie(params: PaginationParams) {
    const {
      page,
      limit,
      school,
      order,
      serie,
      search,
      typeSchool,
      verifyProfileForState,
    } = params
    const queryBuilder = this.schoolClassRepository
      .createQueryBuilder('SchoolClass')
      .select([
        'SchoolClass.TUR_ID',
        'SchoolClass.TUR_NOME',
        'SchoolClass.TUR_ANO',
        'SchoolClass.TUR_TIPO',
      ])
      .innerJoin(
        'SchoolClass.TUR_ESC',
        'school',
        'school.ESC_TIPO = :typeSchool',
        {
          typeSchool,
        },
      )
      .innerJoin('SchoolClass.TUR_MUN', 'county')
      .orderBy('SchoolClass.TUR_NOME', order)
      .where('SchoolClass.TUR_SER = :serie', { serie })
      .andWhere('SchoolClass.TUR_ESC = :school', { school })
      .andWhere('SchoolClass.TUR_ATIVO = 1')

    if (search) {
      queryBuilder.andWhere('SchoolClass.TUR_NOME LIKE :search', {
        search: `%${search}%`,
      })
    }

    if (verifyProfileForState && typeSchool === TypeSchoolEnum.MUNICIPAL) {
      queryBuilder.andWhere('county.MUN_COMPARTILHAR_DADOS IS TRUE')
    }

    const data = await paginateData(+page, +limit, queryBuilder)

    const formatData = await Promise.all(
      data?.items?.map(async (schoolClassMap) => {
        const { totalGrouped } = await this.getTotalStudentsGrouped({
          ...params,
          schoolClass: schoolClassMap.TUR_ID,
        })

        return {
          ...schoolClassMap,
          TOTAL_ENTURMADO: totalGrouped,
          TOTAL_ALUNOS: totalGrouped,
        }
      }),
    )

    return {
      ...data,
      items: formatData,
    }
  }

  async getGroupingBySchool(params: PaginationParams) {
    const {
      page,
      limit,
      school,
      order,
      search,
      typeSchool,
      verifyProfileForState,
    } = params

    const queryBuilder = this.seriesClassRepository
      .createQueryBuilder('Series')
      .select(['Series.SER_ID', 'Series.SER_NOME'])
      .innerJoin('Series.SER_TUR', 'SER_TUR', 'SER_TUR.TUR_ATIVO = 1')
      .innerJoin(
        'SER_TUR.TUR_ESC',
        'TUR_ESC',
        'TUR_ESC.ESC_TIPO = :typeSchool',
        {
          typeSchool,
        },
      )
      .innerJoin('SER_TUR.TUR_MUN', 'county')
      .where('SER_TUR.TUR_ESC = :school', { school })
      .andWhere('Series.SER_ATIVO = 1')
      .orderBy('Series.SER_NOME', order)

    if (verifyProfileForState && typeSchool === TypeSchoolEnum.MUNICIPAL) {
      queryBuilder.andWhere('county.MUN_COMPARTILHAR_DADOS IS TRUE')
    }

    if (search) {
      queryBuilder.andWhere('Series.SER_NOME LIKE :search', {
        search: `%${search}%`,
      })
    }
    const data = await paginateData(+page, +limit, queryBuilder)

    const formatData = await Promise.all(
      data?.items?.map(async (mapSerie) => {
        const { totalGrouped, totalStudents } = await this.getTotalStudents({
          ...params,
          serie: String(mapSerie.SER_ID),
        })

        return {
          ...mapSerie,
          TOTAL_ENTURMADO: totalGrouped,
          TOTAL_ALUNOS: totalStudents,
        }
      }),
    )

    return {
      ...data,
      items: formatData,
    }
  }

  async getGroupingByMunicipality(params: PaginationParams) {
    const {
      page,
      limit,
      municipalityOrUniqueRegionalId,
      order,
      search,
      typeSchool,
      verifyProfileForState,
    } = params

    const queryBuilder = this.schoolRepository
      .createQueryBuilder('School')
      .select([
        'School.ESC_ID',
        'School.ESC_NOME',
        'School.ESC_INEP',
        'School.ESC_TIPO',
      ])
      .innerJoin('School.ESC_MUN', 'county')
      .orderBy('School.ESC_NOME', order)
      .where('School.regionalId = :regionalId', {
        regionalId: municipalityOrUniqueRegionalId,
      })
      .andWhere('School.ESC_ATIVO = 1')
      .andWhere('School.ESC_TIPO = :typeSchool', { typeSchool })

    if (search) {
      queryBuilder.andWhere(
        '(School.ESC_NOME LIKE :search OR School.ESC_INEP LIKE :search)',
        { search: `%${search}%` },
      )
    }

    if (verifyProfileForState && typeSchool === TypeSchoolEnum.MUNICIPAL) {
      queryBuilder.andWhere('county.MUN_COMPARTILHAR_DADOS IS TRUE')
    }

    const data = await paginateData(+page, +limit, queryBuilder)

    const formatData = await Promise.all(
      data?.items?.map(async (mapSchool) => {
        const { totalGrouped, totalStudents, totalNotGrouped } =
          await this.getTotalStudents({
            ...params,
            school: mapSchool.ESC_ID,
          })

        return {
          ...mapSchool,
          TOTAL_ALUNOS: totalStudents,
          TOTAL_ENTURMADO: totalGrouped,
          TOTAL_NAO_ENTURMADO: totalNotGrouped,
        }
      }),
    )

    return {
      ...data,
      items: formatData,
    }
  }

  async getGroupingByCounty(params: PaginationParams, user: User) {
    const type = !params?.typeSchool
      ? null
      : params?.typeSchool === TypeSchoolEnum.ESTADUAL
        ? TypeRegionalEnum.UNICA
        : TypeRegionalEnum.MUNICIPAL

    const data = await this.regionalService.findAllForFilter(
      { ...params, type, countQueries: true },
      user,
    )

    const formatData = await Promise.all(
      data?.items?.map(async (regional) => {
        const { totalGrouped, totalStudents, totalNotGrouped } =
          await this.getTotalStudents({
            ...params,
            municipalityOrUniqueRegionalId: regional.id,
          })

        return {
          ...regional,
          TOTAL_ALUNOS: totalStudents,
          TOTAL_ENTURMADO: totalGrouped,
          TOTAL_NAO_ENTURMADO: totalNotGrouped,
        }
      }),
    )

    return {
      ...data,
      items: formatData,
    }
  }

  async getGroupingByStateRegional(params: PaginationParams) {
    const {
      page,
      limit,
      order,
      search,
      stateRegionalId,
      verifyProfileForState,
      typeSchool,
    } = params
    const queryBuilder = this.countyRepository
      .createQueryBuilder('Counties')
      .select(['Counties.MUN_ID', 'Counties.MUN_NOME', 'Counties.MUN_UF'])
      .orderBy('Counties.MUN_NOME', order)
      .where('Counties.stateRegionalId = :stateRegionalId', { stateRegionalId })

    if (verifyProfileForState && typeSchool === TypeSchoolEnum.MUNICIPAL) {
      queryBuilder.andWhere('Counties.MUN_COMPARTILHAR_DADOS IS TRUE')
    }

    if (search) {
      queryBuilder.andWhere('Counties.MUN_NOME LIKE :search', {
        search: `%${search}%`,
      })
    }

    const data = await paginateData(page, limit, queryBuilder)

    const formatData = await Promise.all(
      data?.items?.map(async (mapCounty) => {
        const { totalGrouped, totalStudents, totalNotGrouped } =
          await this.getTotalStudents({
            ...params,
            county: mapCounty.MUN_ID,
          })

        return {
          ...mapCounty,
          TOTAL_ALUNOS: totalStudents,
          TOTAL_ENTURMADO: totalGrouped,
          TOTAL_NAO_ENTURMADO: totalNotGrouped,
        }
      }),
    )

    return {
      ...data,
      items: formatData,
    }
  }

  async getGroupingByState(params: PaginationParams, user: User) {
    const data = await this.regionalService.findAllForFilter(
      { ...params, type: TypeRegionalEnum.ESTADUAL, countQueries: true },
      user,
    )

    const formatData = await Promise.all(
      data?.items?.map(async (regional) => {
        const { totalGrouped, totalStudents, totalNotGrouped } =
          await this.getTotalStudents({
            ...params,
            stateRegionalId: regional.id,
          })

        return {
          ...regional,
          TOTAL_ALUNOS: totalStudents,
          TOTAL_ENTURMADO: totalGrouped,
          TOTAL_NAO_ENTURMADO: totalNotGrouped,
        }
      }),
    )

    return {
      ...data,
      items: formatData,
    }
  }
}
