import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectConnection, InjectRepository } from '@nestjs/typeorm'
import * as _ from 'lodash'
import { PaginationParams } from 'src/helpers/params'
import { TypeSchoolEnum } from 'src/modules/school/model/enum/type-school.enum'
import { User } from 'src/modules/user/model/entities/user.entity'
import { formatParamsByProfile } from 'src/utils/format-params-by-profile'
import { Connection, Repository } from 'typeorm'

import { Serie } from '../../serie/model/entities/serie.entity'
import { selectDefaultReportSubject } from '../constants/default-selects'
import { ReportEdition } from '../model/entities/report-edition.entity'

@Injectable()
export class EvolutionaryLineRepository {
  constructor(
    @InjectRepository(ReportEdition)
    private reportEditionRepository: Repository<ReportEdition>,

    @InjectRepository(Serie)
    private seriesRepository: Repository<Serie>,

    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async getDataReports(
    paginationParams: PaginationParams,
    user: User,
    isReading = false,
  ) {
    const params = formatParamsByProfile(paginationParams, user)

    const {
      year,
      edition,
      schoolClass,
      school,
      serie,
      municipalityOrUniqueRegionalId,
      typeSchool,
      verifyProfileForState,
    } = params

    const currentSerie = await this.seriesRepository.findOne(serie)

    if (!currentSerie) {
      throw new BadRequestException('Parameter serie is invalid')
    }

    if (!municipalityOrUniqueRegionalId) {
      const { items } = await this.getReportEditionGroupedByCounty(
        params,
        user,
        isReading,
      )

      return {
        currentSerie,
        reports: items,
      }
    }

    const queryBuilder = this.reportEditionRepository
      .createQueryBuilder('ReportEdition')
      .addSelect(['ReportEdition.id'])
      .addSelect(['edition.AVA_ID', 'edition.AVA_NOME', 'test.TES_ID'])
      .innerJoinAndSelect('ReportEdition.edition', 'edition')
      .innerJoinAndSelect('ReportEdition.reportsSubjects', 'reportsSubjects')
      .innerJoin('reportsSubjects.test', 'test')
      .andWhere('test.TES_SER = :serieId', { serieId: serie })

    if (isReading) {
      queryBuilder.innerJoin(
        'test.TES_DIS',
        'TES_DIS',
        `TES_DIS.DIS_TIPO = 'Leitura'`,
      )
    } else {
      queryBuilder.innerJoinAndSelect('test.TES_DIS', 'TES_DIS')
    }

    if (typeSchool) {
      queryBuilder.andWhere('ReportEdition.type = :type', {
        type: typeSchool,
      })
    }

    if (year) {
      queryBuilder.andWhere('edition.AVA_ANO = :year', { year })
    }

    if (edition) {
      queryBuilder.andWhere('edition.AVA_ID = :assessmentId', {
        assessmentId: edition,
      })
    }

    if (schoolClass) {
      queryBuilder
        .innerJoin(
          'ReportEdition.schoolClass',
          'schoolClass',
          'schoolClass.TUR_ID = :schoolClassId',
          { schoolClassId: schoolClass },
        )
        .innerJoin('schoolClass.TUR_MUN', 'county')
    } else if (school) {
      queryBuilder
        .innerJoin(
          'ReportEdition.school',
          'school',
          'school.ESC_ID = :schoolId',
          { schoolId: school },
        )
        .innerJoin('school.ESC_MUN', 'county')
    } else if (municipalityOrUniqueRegionalId) {
      queryBuilder
        .innerJoin(
          'ReportEdition.regional',
          'regional',
          'regional.id = :municipalityOrUniqueRegionalId',
          { municipalityOrUniqueRegionalId },
        )
        .innerJoin('regional.county', 'county')
    }

    if (!typeSchool && verifyProfileForState) {
      queryBuilder.andWhere(
        `((ReportEdition.type = '${TypeSchoolEnum.ESTADUAL}') or (ReportEdition.type = '${TypeSchoolEnum.MUNICIPAL}' && county.MUN_COMPARTILHAR_DADOS IS TRUE))`,
      )
    }

    if (verifyProfileForState && typeSchool === TypeSchoolEnum.MUNICIPAL) {
      queryBuilder.andWhere('county.MUN_COMPARTILHAR_DADOS IS TRUE')
    }

    const reports = await queryBuilder.getMany()

    return {
      currentSerie,
      reports,
    }
  }

  private async getReportEditionGroupedByCounty(
    {
      year,
      edition,
      serie,
      typeSchool,
      stateRegionalId,
      county,
      stateId,
      verifyProfileForState,
    }: PaginationParams,
    user: User,
    isReading = false,
  ) {
    const queryBuilder = this.connection
      .getRepository(ReportEdition)
      .createQueryBuilder('ReportEdition')
      .select(selectDefaultReportSubject)
      .addSelect(['edition.AVA_ID as id', 'edition.AVA_NOME as name'])
      .innerJoin(
        'report_subject',
        'REPORT_SUBJECT',
        'ReportEdition.id = REPORT_SUBJECT.reportEditionId',
      )
      .innerJoin('REPORT_SUBJECT.test', 'test', 'test.TES_SER = :serieId', {
        serieId: serie,
      })
      .innerJoin('ReportEdition.edition', 'edition')
      .innerJoin('ReportEdition.county', 'county')
      .andWhere('edition.AVA_ANO = :year', { year })
      .andWhere('REPORT_SUBJECT.countTotalStudents > 0')
      .groupBy('REPORT_SUBJECT.testTESID, ReportEdition.editionAVAID')

    if (!edition) {
      if (isReading) {
        queryBuilder.innerJoin(
          'test.TES_DIS',
          'TES_DIS',
          `TES_DIS.DIS_TIPO = 'Leitura'`,
        )
      } else {
        queryBuilder
          .addSelect([
            'TES_DIS.DIS_ID as subjectId',
            'TES_DIS.DIS_TIPO as subjectType',
            'TES_DIS.DIS_NOME as subjectName',
            'TES_DIS.DIS_COLOR as subjectColor',
          ])
          .innerJoin('test.TES_DIS', 'TES_DIS')
      }
    } else {
      queryBuilder.andWhere('edition.AVA_ID = :assessmentId', {
        assessmentId: edition,
      })

      if (isReading) {
        queryBuilder.innerJoin(
          'test.TES_DIS',
          'TES_DIS',
          `TES_DIS.DIS_TIPO = 'Leitura'`,
        )
      }
    }

    if (typeSchool) {
      queryBuilder.andWhere('ReportEdition.type = :type', { type: typeSchool })
    }

    if (county) {
      queryBuilder.andWhere('ReportEdition.countyMUNID = :countyId', {
        countyId: county,
      })
    } else if (stateRegionalId) {
      queryBuilder.andWhere('county.stateRegionalId = :stateRegionalId', {
        stateRegionalId,
      })
    } else if (stateId) {
      queryBuilder.andWhere('county.stateId = :stateId', {
        stateId,
      })
    } else if (serie) {
      queryBuilder.andWhere('county.MUN_PARCEIRO_EPV IS TRUE')
    }

    if (!typeSchool && verifyProfileForState) {
      queryBuilder.andWhere(
        `((ReportEdition.type = '${TypeSchoolEnum.ESTADUAL}') or (ReportEdition.type = '${TypeSchoolEnum.MUNICIPAL}' && county.MUN_COMPARTILHAR_DADOS IS TRUE))`,
      )
    }

    if (verifyProfileForState && typeSchool === TypeSchoolEnum.MUNICIPAL) {
      queryBuilder.andWhere('county.MUN_COMPARTILHAR_DADOS IS TRUE')
    }

    const reportEditions = await queryBuilder.getRawMany()

    const reportEditionsGroupedByRegional = _.groupBy(
      reportEditions,
      (reportEdition) => `${reportEdition.id}`,
    )

    const items = []
    Object.keys(reportEditionsGroupedByRegional).map(async (key) => {
      const reportEdition = reportEditionsGroupedByRegional[key][0]

      const formatItem = {
        edition: {
          AVA_ID: reportEdition?.id,
          AVA_NOME: reportEdition?.name,
        },
        reportsSubjects: reportEditionsGroupedByRegional[key]?.map((report) => {
          return {
            ...report,
            test: {
              TES_ID: report.testId,
              TES_DIS: {
                DIS_ID: report?.subjectId,
                DIS_TIPO: report?.subjectType,
                DIS_NOME: report?.subjectName,
                DIS_COLOR: report?.subjectColor,
              },
            },
          }
        }),
      }

      items.push(formatItem)
    })

    return {
      items,
    }
  }
}
