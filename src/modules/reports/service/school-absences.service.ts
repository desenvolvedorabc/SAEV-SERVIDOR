import { Injectable } from '@nestjs/common'
import { InjectConnection, InjectRepository } from '@nestjs/typeorm'
import { Parser } from 'json2csv'
import { PaginationParams } from 'src/helpers/params'
import { County } from 'src/modules/counties/model/entities/county.entity'
import { TypeRegionalEnum } from 'src/modules/regional/model/enum/type-regional.enum'
import { RegionalService } from 'src/modules/regional/regional.service'
import { School } from 'src/modules/school/model/entities/school.entity'
import { TypeSchoolEnum } from 'src/modules/school/model/enum/type-school.enum'
import { SchoolAbsence } from 'src/modules/school-absences/model/entities/school-absences.entity'
import { SchoolClass } from 'src/modules/school-class/model/entities/school-class.entity'
import { Serie } from 'src/modules/serie/model/entities/serie.entity'
import { StudentService } from 'src/modules/student/service/student.service'
import { User } from 'src/modules/user/model/entities/user.entity'
import { InternalServerError } from 'src/utils/errors'
import { formatParamsByProfile } from 'src/utils/format-params-by-profile'
import { namesForMonths } from 'src/utils/months-name'
import { paginateData } from 'src/utils/paginate-data'
import { Connection, Repository } from 'typeorm'

const optionsFilter = {
  county: ['MUN_ID', 'MUN_NOME', null],
  stateRegionalId: ['id', 'name', null],
  municipalityOrUniqueRegionalId: ['id', 'name', null],
  school: ['ESC_ID', 'ESC_NOME', 'ESC_TIPO'],
  serie: ['SER_ID', 'SER_NOME', null],
  schoolClass: ['TUR_ID', 'TUR_NOME', null],
  student: ['ALU_ID', 'ALU_NOME', null],
}

const namesInBROfTheLevel = {
  year: 'Ano',
  county: 'Município',
  stateRegionalId: 'Regional Estadual',
  municipalityOrUniqueRegionalId: 'Regional Mun/Uni',
  school: 'Escola',
  serie: 'Serie',
  schoolClass: 'Turma',
  student: 'Aluno',
}

@Injectable()
export class ReportSchoolAbsencesService {
  constructor(
    @InjectRepository(SchoolAbsence)
    private schoolAbsencesRepository: Repository<SchoolAbsence>,

    private readonly studentsService: StudentService,

    private readonly regionalService: RegionalService,

    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async handle(dto: PaginationParams, user: User) {
    const params = formatParamsByProfile(dto, user)

    const { data, level } = await this.getData(params, user)

    const { graph } = await this.getGraphAndTotalInfrequencyForMonths(params)

    const formattedData = await Promise.all(
      data.items.map(async (item) => {
        const { graph: graphAndTotal } =
          await this.getGraphAndTotalInfrequencyForMonths({
            ...params,
            [level]: item[optionsFilter[level][0]],
          })

        return {
          id: item[optionsFilter[level][0]],
          name: item[optionsFilter[level][1]],
          type: item[optionsFilter[level][2]],
          graph: graphAndTotal,
        }
      }),
    )

    return {
      graph,
      data: {
        ...data,
        items: formattedData,
      },
    }
  }

  async generateCsvOfReport(dto: PaginationParams, user: User) {
    const { data, level } = await this.getData(dto, user, true)

    const formattedData = await Promise.all(
      data.items.map(async (item) => {
        const { graph } = await this.getGraphAndTotalInfrequencyForMonths({
          ...dto,
          [level]: item[optionsFilter[level][0]],
        })

        const formattedMonths = graph.months.reduce((acc, item) => {
          acc[namesForMonths[item.month]] = item.total

          return acc
        }, {})

        return {
          nivel: namesInBROfTheLevel[level],
          ano: dto.year,
          id: item[optionsFilter[level][0]],
          nome: item[optionsFilter[level][1]],
          total_faltas: graph.total_infrequency,
          total_enturmados: level === 'student' ? 'N/A' : graph.total_grouped,

          ...formattedMonths,
        }
      }),
    )

    const parser = new Parser({
      quote: ' ',
      withBOM: true,
      delimiter: ';',
    })

    try {
      const csv = parser.parse(formattedData)
      return csv
    } catch (error) {
      throw new InternalServerError()
    }
  }

  private async getGraphAndTotalInfrequencyForMonths(dto: PaginationParams) {
    const numbersOfMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

    let total_grouped = 0

    if (!dto.student) {
      const { totalGrouped } =
        await this.studentsService.getTotalStudentsGrouped(dto)

      total_grouped = totalGrouped
    }

    let total = 0

    const months = await Promise.all(
      numbersOfMonths.map(async (month) => {
        const { total: totalForMonth } =
          await this.getTotalInfrequencyForReport({ ...dto, month })

        total += totalForMonth

        return {
          month,
          total: totalForMonth,
        }
      }),
    )

    const graph = {
      months,
      total_infrequency: total,
      total_grouped,
    }

    return {
      graph,
    }
  }

  private async getTotalInfrequencyForReport({
    year,
    county,
    school,
    serie,
    month,
    schoolClass,
    student,
    verifyProfileForState,
    municipalityOrUniqueRegionalId,
    stateId,
    stateRegionalId,
    typeSchool,
    isEpvPartner,
  }: PaginationParams) {
    const queryBuilder = this.schoolAbsencesRepository
      .createQueryBuilder('SchoolAbsences')
      .select('SUM(SchoolAbsences.IFR_FALTA) as totalInfrequency')
      .innerJoin('SchoolAbsences.IFR_SCHOOL_CLASS', 'IFR_SCHOOL_CLASS')
      .innerJoin(
        'IFR_SCHOOL_CLASS.TUR_ESC',
        'school',
        'school.ESC_TIPO = :typeSchool',
        { typeSchool },
      )
      .innerJoin('IFR_SCHOOL_CLASS.TUR_MUN', 'county')
      .where('SchoolAbsences.IFR_ANO = :year', { year })

    if (verifyProfileForState && typeSchool === TypeSchoolEnum.MUNICIPAL) {
      queryBuilder.andWhere('county.MUN_COMPARTILHAR_DADOS IS TRUE')
    }

    if (month) {
      queryBuilder.andWhere('SchoolAbsences.IFR_MES = :month', { month })
    }

    if (serie) {
      queryBuilder.andWhere('IFR_SCHOOL_CLASS.TUR_SER = :serie', { serie })
    }

    if (student) {
      queryBuilder.andWhere('SchoolAbsences.IFR_ALU = :student', {
        student,
      })
    }

    if (schoolClass) {
      queryBuilder.andWhere('IFR_SCHOOL_CLASS.TUR_ID = :schoolClass', {
        schoolClass,
      })
    }

    if (school) {
      queryBuilder.andWhere('IFR_SCHOOL_CLASS.TUR_ESC = :school', { school })
    } else if (municipalityOrUniqueRegionalId) {
      queryBuilder.andWhere(
        'school.regionalId = :municipalityOrUniqueRegionalId',
        {
          municipalityOrUniqueRegionalId,
        },
      )
    } else if (county) {
      queryBuilder.andWhere('county.MUN_ID = :county', { county })
    } else if (stateRegionalId) {
      queryBuilder.andWhere('county.stateRegionalId = :stateRegionalId', {
        stateRegionalId,
      })
    } else if (stateId) {
      queryBuilder.andWhere('county.stateId = :stateId', {
        stateId,
      })
    }
    if (+isEpvPartner) {
      queryBuilder.andWhere('county.MUN_PARCEIRO_EPV IS TRUE')
    }

    const { totalInfrequency } = await queryBuilder.getRawOne()

    return {
      total: +totalInfrequency ?? 0,
    }
  }

  private async getData(
    paginationParams: PaginationParams,
    user: User,
    isCsv = false,
  ) {
    const {
      limit,
      page,
      year,
      serie,
      school,
      county,
      schoolClass,
      typeSchool,
      municipalityOrUniqueRegionalId,
      stateRegionalId,
      stateId,
      verifyProfileForState,
    } = paginationParams

    let queryBuilder
    let level = 'year'

    if (schoolClass) {
      const data = await this.studentsService.getStudentsGroupedBySchoolClass(
        paginationParams,
        isCsv,
      )
      return { data, level: 'student' }
    } else if (serie) {
      level = 'schoolClass'

      queryBuilder = this.connection
        .getRepository(SchoolClass)
        .createQueryBuilder('SchoolClass')
        .select(['SchoolClass.TUR_ID', 'SchoolClass.TUR_NOME'])
        .innerJoin('SchoolClass.TUR_MUN', 'county')
        .orderBy('SchoolClass.TUR_NOME', 'ASC')
        .where('SchoolClass.TUR_SER = :serie', { serie })
        .andWhere('SchoolClass.TUR_ESC = :school', { school })
        .andWhere('SchoolClass.TUR_ANO = :year', { year })
    } else if (school) {
      level = 'serie'
      queryBuilder = this.connection
        .getRepository(Serie)
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
        .orderBy('Series.SER_NOME', 'ASC')
    } else if (municipalityOrUniqueRegionalId) {
      level = 'school'
      queryBuilder = this.connection
        .getRepository(School)
        .createQueryBuilder('School')
        .select([
          'School.ESC_ID',
          'School.ESC_NOME',
          'School.ESC_INEP',
          'School.ESC_TIPO',
        ])
        .innerJoin('School.ESC_MUN', 'county')
        .orderBy('School.ESC_NOME', 'ASC')
        .where('School.regionalId = :regionalId', {
          regionalId: municipalityOrUniqueRegionalId,
        })
        .andWhere('School.ESC_ATIVO = 1')
        .andWhere('School.ESC_TIPO = :typeSchool', { typeSchool })
    } else if (county) {
      level = 'municipalityOrUniqueRegionalId'
      const type = !paginationParams?.typeSchool
        ? null
        : paginationParams?.typeSchool === TypeSchoolEnum.ESTADUAL
          ? TypeRegionalEnum.UNICA
          : TypeRegionalEnum.MUNICIPAL

      const data = await this.regionalService.findAllForFilter(
        { ...paginationParams, type, countQueries: true },
        user,
      )

      return { data, level }
    } else if (stateRegionalId) {
      level = 'county'
      queryBuilder = this.connection
        .getRepository(County)
        .createQueryBuilder('county')
        .select(['county.MUN_ID', 'county.MUN_NOME', 'county.MUN_UF'])
        .orderBy('county.MUN_NOME', 'ASC')
        .where('county.stateRegionalId = :stateRegionalId', {
          stateRegionalId,
        })
    } else if (stateId) {
      level = 'stateRegionalId'
      const data = await this.regionalService.findAllForFilter(
        {
          ...paginationParams,
          type: TypeRegionalEnum.ESTADUAL,
          countQueries: true,
        },
        user,
      )

      return {
        data,
        level,
      }
    } else if (year) {
      level = 'county'
      queryBuilder = this.connection
        .getRepository(County)
        .createQueryBuilder('county')
        .select(['county.MUN_ID', 'county.MUN_NOME', 'county.MUN_UF'])
        .andWhere('county.MUN_PARCEIRO_EPV IS TRUE')
        .orderBy('county.MUN_NOME', 'ASC')
    }

    if (queryBuilder) {
      if (verifyProfileForState && typeSchool === TypeSchoolEnum.MUNICIPAL) {
        queryBuilder.andWhere('county.MUN_COMPARTILHAR_DADOS IS TRUE')
      }

      const data = await paginateData(page, limit, queryBuilder, isCsv)

      return { data, level }
    }

    return {
      data: {
        items: [],
      },
      level: 'year',
    }
  }
}
