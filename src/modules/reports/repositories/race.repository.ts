import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import * as _ from 'lodash'
import { PaginationParams } from 'src/helpers/params'
import { TypeSchoolEnum } from 'src/modules/school/model/enum/type-school.enum'
import { Repository } from 'typeorm'

import { selectDefaultReportRace } from '../constants/default-selects'
import { ReportEdition } from '../model/entities/report-edition.entity'

@Injectable()
export class ReportRaceRepository {
  constructor(
    @InjectRepository(ReportEdition)
    private reportEditionRepository: Repository<ReportEdition>,
  ) {}

  async getDataReports(paginationParams: PaginationParams) {
    const {
      year,
      schoolClass,
      school,
      serie,
      municipalityOrUniqueRegionalId,
      typeSchool,
      verifyProfileForState,
    } = paginationParams

    if (!municipalityOrUniqueRegionalId) {
      const { items } =
        await this.getReportEditionGroupedByCounty(paginationParams)

      return {
        reports: items,
      }
    }

    const queryBuilder = this.reportEditionRepository
      .createQueryBuilder('ReportEdition')
      .addSelect(['ReportEdition.id'])
      .addSelect([
        'edition.AVA_ID',
        'edition.AVA_NOME',
        'test.TES_ID',
        'reportsSubjects.id',
        'reportsSubjects.countTotalStudents',
        'reportsSubjects.totalGradesStudents',
        'reportsSubjects.countPresentStudents',
        'TES_DIS.DIS_ID',
      ])
      .innerJoinAndSelect('ReportEdition.edition', 'edition')
      .innerJoin('ReportEdition.reportsSubjects', 'reportsSubjects')
      .innerJoinAndSelect('reportsSubjects.reportRaces', 'reportRaces')
      .innerJoin('reportsSubjects.test', 'test')
      .innerJoin('test.TES_DIS', 'TES_DIS')
      .andWhere('test.TES_SER = :serieId', { serieId: serie })

    if (typeSchool) {
      queryBuilder.andWhere('ReportEdition.type = :type', {
        type: typeSchool,
      })
    }

    if (year) {
      queryBuilder.andWhere('edition.AVA_ANO = :year', { year })
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
      reports,
    }
  }

  async getReportEditionGroupedByCounty({
    year,
    serie,
    typeSchool,
    stateRegionalId,
    county,
    stateId,
    verifyProfileForState,
  }: PaginationParams) {
    const queryBuilder = this.reportEditionRepository
      .createQueryBuilder('ReportEdition')
      .select(selectDefaultReportRace)
      .addSelect([
        'REPORT_RACE.reportSubjectId',
        'edition.AVA_ID as editionId',
        'edition.AVA_NOME as editionIdName',
        'TES_DIS.DIS_ID as subjectId',
        'TES_DIS.DIS_NOME as subjectName',
      ])
      .innerJoin(
        'report_subject',
        'REPORT_SUBJECT',
        'ReportEdition.id = REPORT_SUBJECT.reportEditionId',
      )
      .innerJoin(
        'report_race',
        'REPORT_RACE',
        'REPORT_SUBJECT.id = REPORT_RACE.reportSubjectId',
      )
      .innerJoin('REPORT_SUBJECT.test', 'test', 'test.TES_SER = :serieId', {
        serieId: serie,
      })
      .innerJoin('test.TES_DIS', 'TES_DIS')
      .innerJoin(
        'ReportEdition.edition',
        'edition',
        'edition.AVA_ANO = :year',
        { year },
      )
      .innerJoin('ReportEdition.county', 'county')
      .groupBy(
        'REPORT_RACE.name, ReportEdition.editionAVAID, REPORT_SUBJECT.testTESID',
      )

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

    const reportEditionsGroupedByEdition = _.groupBy(
      reportEditions,
      (reportEdition) => `${reportEdition.editionId}`,
    )

    const items = []
    Object.keys(reportEditionsGroupedByEdition)?.map(async (key) => {
      const reportEdition = reportEditionsGroupedByEdition[key][0]
      const reportSubjects = []

      const reportEditionsGroupedBySubject = _.groupBy(
        reportEditionsGroupedByEdition[key],
        (mapReportEdition) => `${mapReportEdition.subjectId}`,
      )

      Object.keys(reportEditionsGroupedBySubject)?.map(async (keySubject) => {
        const reportSubject = reportEditionsGroupedBySubject[keySubject][0]

        const subjectItem = {
          id: reportSubject?.reportSubjectId,
          totalGradesStudents: +reportSubject?.totalGradesStudentsSubject,
          countPresentStudents: +reportSubject?.countPresentStudentsSubject,
          test: {
            // TES_ID: report.testId,
            TES_DIS: {
              DIS_ID: reportSubject?.subjectId,
              DIS_NOME: reportSubject?.subjectName,
            },
          },
          reportRaces: reportEditionsGroupedBySubject[keySubject]?.map(
            (mapReportSubject) => {
              return {
                ...mapReportSubject,
                countTotalStudents: +mapReportSubject?.countTotalStudents,
                totalGradesStudents: +mapReportSubject?.totalGradesStudents,
                countPresentStudents: +mapReportSubject?.countPresentStudents,
                fluente: +mapReportSubject?.fluente,
                nao_fluente: +mapReportSubject?.nao_fluente,
                frases: +mapReportSubject?.frases,
                palavras: +mapReportSubject?.palavras,
                silabas: +mapReportSubject?.silabas,
                nao_leitor: +mapReportSubject?.nao_leitor,
                nao_avaliado: +mapReportSubject?.nao_avaliado,
                nao_informado: +mapReportSubject?.nao_informado,
              }
            },
          ),
        }

        reportSubjects.push(subjectItem)
      })

      const formatItem = {
        edition: {
          AVA_ID: reportEdition?.editionId,
          AVA_NOME: reportEdition?.editionIdName,
        },
        reportsSubjects: reportSubjects,
      }

      items.push(formatItem)
    })

    return {
      items,
    }
  }
}
