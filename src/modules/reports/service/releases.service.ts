import { Injectable } from '@nestjs/common'
import { InjectConnection, InjectRepository } from '@nestjs/typeorm'
import { PaginationParams } from 'src/helpers/params'
import { Assessment } from 'src/modules/assessment/model/entities/assessment.entity'
import { StudentTest } from 'src/modules/release-results/model/entities/student-test.entity'
import { TypeSchoolEnum } from 'src/modules/school/model/enum/type-school.enum'
import { SchoolClass } from 'src/modules/school-class/model/entities/school-class.entity'
import { Serie } from 'src/modules/serie/model/entities/serie.entity'
import { Student } from 'src/modules/student/model/entities/student.entity'
import { User } from 'src/modules/user/model/entities/user.entity'
import { formatParamsByProfile } from 'src/utils/format-params-by-profile'
import { Connection, Repository } from 'typeorm'

import { ReportEdition } from '../model/entities/report-edition.entity'
import { ReleasesRepository } from '../repositories/releases.repository'
import { EvolutionaryLineService } from './evolutionary-line.service'

@Injectable()
export class ReleasesService {
  constructor(
    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,

    private readonly evolutionaryLineService: EvolutionaryLineService,
    private readonly releasesRepository: ReleasesRepository,

    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async getReportsBySchoolClass({
    schoolClass,
    edition,
    typeSchool,
    verifyProfileForState,
  }: PaginationParams) {
    const queryAsses = this.assessmentRepository
      .createQueryBuilder('Assessment')
      .leftJoinAndSelect('Assessment.AVA_TES', 'AVA_TES')
      .leftJoinAndSelect('AVA_TES.TES_DIS', 'TES_DIS')

    if (edition) {
      queryAsses.andWhere('Assessment.AVA_ID = :AVA_ID', {
        AVA_ID: edition,
      })
    }

    let items = []

    const serieBySchoolClass = await this.connection
      .getRepository(SchoolClass)
      .findOne({
        where: {
          TUR_ID: schoolClass,
        },
        relations: ['TUR_SER'],
      })

    const queryBuilder = this.connection
      .getRepository(ReportEdition)
      .createQueryBuilder('ReportEdition')
      .addSelect(['ReportEdition.id'])
      .innerJoin('ReportEdition.schoolClass', 'schoolClass')
      .innerJoin('schoolClass.TUR_MUN', 'county')
      .innerJoinAndSelect('ReportEdition.reportsSubjects', 'reportsSubjects')
      .innerJoin('reportsSubjects.test', 'test')
      .innerJoin('test.TES_SER', 'TES_SER', `TES_SER.SER_ID = :serie`, {
        serie: serieBySchoolClass.TUR_SER.SER_ID,
      })
      .where('ReportEdition.schoolClass = :schoolClass', { schoolClass })
      .andWhere('ReportEdition.edition = :edition', { edition })

    if (!typeSchool && verifyProfileForState) {
      queryBuilder.andWhere(
        `((ReportEdition.type = '${TypeSchoolEnum.ESTADUAL}') or (ReportEdition.type = '${TypeSchoolEnum.MUNICIPAL}' && county.MUN_COMPARTILHAR_DADOS IS TRUE))`,
      )
    }

    if (verifyProfileForState && typeSchool === TypeSchoolEnum.MUNICIPAL) {
      queryBuilder.andWhere('county.MUN_COMPARTILHAR_DADOS IS TRUE')
    }

    const reportEdition = await queryBuilder.getOne()

    const idsStudents = reportEdition?.reportsSubjects[0]?.idStudents

    queryAsses.innerJoin(
      'AVA_TES.TES_SER',
      'TES_SER',
      `TES_SER.SER_ID IN (:series)`,
      {
        series: serieBySchoolClass.TUR_SER.SER_ID,
      },
    )
    const assessment = await queryAsses.getOne()

    if (assessment && idsStudents?.length) {
      items = await Promise.all(
        idsStudents?.map(async (ALU_ID) => {
          let isParticipatedAll = true

          const student = await this.connection
            .getRepository(Student)
            .createQueryBuilder('Student')
            .select(['Student.ALU_ID', 'Student.ALU_NOME', 'Student.ALU_INEP'])
            .where('Student.ALU_ID = :idStudent', { idStudent: ALU_ID })
            .getOne()

          const subjects = await Promise.all(
            assessment?.AVA_TES?.map(async (test) => {
              const studentTest = await this.connection
                .getRepository(StudentTest)
                .createQueryBuilder('StudentTest')
                .select(['StudentTest.ALT_ID'])
                .where(
                  `StudentTest.ALT_ALU_ID = '${ALU_ID}' AND StudentTest.ALT_TES_ID = '${test?.TES_ID}'`,
                )
                .andWhere('StudentTest.schoolClass = :schoolClass', {
                  schoolClass,
                })
                .getOne()

              if (!studentTest) {
                isParticipatedAll = false
                return {
                  id: test.TES_DIS.DIS_ID,
                  name: test.TES_DIS.DIS_NOME,
                  isRelease: false,
                }
              }

              const isParticipated = !!studentTest

              if (!isParticipated) {
                isParticipatedAll = false
              }

              return {
                id: test.TES_DIS.DIS_ID,
                name: test.TES_DIS.DIS_NOME,
                isRelease: isParticipated,
              }
            }),
          )

          return {
            id: student.ALU_ID,
            name: student.ALU_NOME,
            inep: student.ALU_INEP,
            subjects,
            general: subjects?.length ? isParticipatedAll : false,
          }
        }),
      )
    }

    return {
      items,
    }
  }

  async handle(paginationParams: PaginationParams, user: User) {
    const params = formatParamsByProfile(paginationParams, user)

    const {
      county,
      edition,
      stateId,
      stateRegionalId,
      school,
      schoolClass,
      municipalityOrUniqueRegionalId,
    } = params

    let items = []

    const { reports, series } =
      await this.releasesRepository.getDataReports(params)

    if (schoolClass) {
      const { items: data } =
        await this.getReportsBySchoolClass(paginationParams)

      items = data
    } else if (school) {
      items = reports?.map((reportEdition) => {
        const { grouped, value, filterSubjects, subjects } =
          this.formatDataForReport(reportEdition)

        return {
          id: reportEdition.schoolClass.TUR_ID,
          classe: reportEdition.schoolClass.TUR_NOME,
          name: reportEdition?.schoolClass?.TUR_SER?.SER_NOME ?? '',
          grouped,
          math: 0,
          portuguese: 0,
          reading: 0,
          subjects: filterSubjects,
          general: Math.round(value / subjects.length),
        }
      })
    } else if (municipalityOrUniqueRegionalId) {
      items = reports?.map((reportEdition) => {
        const { grouped, filterSubjects, value, subjects } =
          this.formatDataForReport(reportEdition)

        return {
          id: reportEdition.school.ESC_ID,
          classe: null,
          name: reportEdition.school.ESC_NOME,
          inep: reportEdition.school.ESC_INEP,
          grouped,
          math: 0,
          portuguese: 0,
          reading: 0,
          subjects: filterSubjects,
          general: Math.round(value / subjects.length),
        }
      })
    } else if (county) {
      items = reports?.map((reportEdition) => {
        const { grouped, filterSubjects, value, subjects } =
          this.formatDataForReport(reportEdition)

        return {
          id: reportEdition.regional.id,
          name: reportEdition.regional.name,
          grouped,
          math: 0,
          portuguese: 0,
          reading: 0,
          subjects: filterSubjects,
          general: Math.round(value / subjects.length),
        }
      })
    } else if (stateRegionalId) {
      items = reports?.map((reportEdition) => {
        const { grouped, filterSubjects, value, subjects } =
          this.formatDataForReport(reportEdition)

        return {
          id: reportEdition.county.MUN_ID,
          name: reportEdition.county.MUN_NOME,
          uf: reportEdition.county.MUN_UF,
          grouped,
          math: 0,
          portuguese: 0,
          reading: 0,
          subjects: filterSubjects,
          general: Math.round(value / subjects.length),
        }
      })
    } else if (stateId) {
      items = reports?.map((reportEdition) => {
        const { grouped, filterSubjects, value, subjects } =
          this.formatDataForReport(reportEdition)

        return {
          id: reportEdition.regional.id,
          name: reportEdition.regional.name,
          grouped,
          math: 0,
          portuguese: 0,
          reading: 0,
          subjects: filterSubjects,
          general: Math.round(value / subjects.length),
        }
      })
    } else if (edition) {
      items = reports?.map((reportEdition) => {
        const { grouped, filterSubjects, value, subjects } =
          this.formatDataForReport(reportEdition)

        return {
          id: reportEdition.county.MUN_ID,
          name: reportEdition.county.MUN_NOME,
          uf: reportEdition.county.MUN_UF,
          grouped,
          math: 0,
          portuguese: 0,
          reading: 0,
          subjects: filterSubjects,
          general: Math.round(value / subjects.length),
        }
      })
    }

    const { reportBySeries } = await this.getReportBySeries(
      series,
      params,
      user,
    )

    return {
      series: {
        type: 'bar',
        level: 'serie',
        items: reportBySeries,
      },
      items,
    }
  }

  async getReportBySeries(
    series: Serie[],
    params: PaginationParams,
    user: User,
  ) {
    const reportBySeries = await Promise.all(
      series.map(async (ser) => {
        const assessments = await this.evolutionaryLineService.evolutionaryLine(
          {
            ...params,
            serie: ser.SER_ID,
          } as any,
          user,
          true,
        )

        const tests = []

        assessments.items.forEach((assessment) => {
          tests.push(...assessment.subjects)
        })

        const value = tests.reduce((acc, cur) => {
          return acc + cur.percentageFinished
        }, 0)

        return {
          id: ser.SER_ID,
          name: ser.SER_NOME,
          value: value ? +(value / tests.length).toFixed(2) : 0,
        }
      }),
    )

    return {
      reportBySeries,
    }
  }

  private formatDataForReport(reportEdition: ReportEdition) {
    const filterReportSubjects = reportEdition.reportsSubjects
      .sort((a, b) => b.countTotalStudents - a.countTotalStudents)
      .filter(function (a) {
        return (
          !this[JSON.stringify(a?.test?.TES_SER?.SER_ID)] &&
          (this[JSON.stringify(a?.test?.TES_SER?.SER_ID)] = true)
        )
      }, Object.create(null))

    const grouped = filterReportSubjects.reduce(
      (acc, cur) => acc + cur.countTotalStudents,
      0,
    )

    const subjects = reportEdition.reportsSubjects.map((test) => {
      return {
        id: test?.test?.TES_DIS.DIS_ID,
        name: test?.test?.TES_DIS.DIS_NOME,
        grouped: test.countTotalStudents,
        countTotalStudents: test.countTotalStudents,
        percentageFinished:
          test.countTotalStudents > 0
            ? Math.round(
                (test.countStudentsLaunched / test.countTotalStudents) * 100,
              )
            : 0,
      }
    })

    const value = subjects.reduce((acc, cur) => {
      return acc + cur.percentageFinished
    }, 0)

    const reduce = subjects.reduce((acc, cur) => {
      if (acc[cur.name]) {
        acc[cur.name] = {
          value: acc[cur.name].value + cur.percentageFinished,
          count: acc[cur.name].count + 1,
        }
      } else {
        acc[cur.name] = {
          value: cur.percentageFinished,
          count: 1,
        }
      }

      return acc
    }, {})

    let filterSubjects = subjects.filter(function (a) {
      return (
        !this[JSON.stringify(a?.name)] && (this[JSON.stringify(a?.name)] = true)
      )
    }, Object.create(null))

    filterSubjects = filterSubjects.map((subject) => {
      return {
        ...subject,
        percentageFinished: Math.round(
          reduce[subject.name].value / reduce[subject.name].count,
        ),
      }
    })

    return {
      grouped,
      value,
      subjects,
      filterSubjects,
    }
  }
}
