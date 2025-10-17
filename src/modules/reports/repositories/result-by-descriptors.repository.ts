import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import * as _ from 'lodash'
import { PaginationParams } from 'src/helpers/params'
import { Headquarter } from 'src/modules/headquarters/model/entities/headquarter.entity'
import { TypeSchoolEnum } from 'src/modules/school/model/enum/type-school.enum'
import { Repository } from 'typeorm'

import { ReportEdition } from '../model/entities/report-edition.entity'

@Injectable()
export class ResultByDescriptorsRepository {
  constructor(
    @InjectRepository(Headquarter)
    private headquartersRepository: Repository<Headquarter>,

    @InjectRepository(ReportEdition)
    private reportEditionRepository: Repository<ReportEdition>,
  ) {}

  async getDataReports(params: PaginationParams) {
    const {
      year,
      edition,
      school,
      serie,
      schoolClass,
      typeSchool,
      municipalityOrUniqueRegionalId,
      verifyProfileForState,
    } = params

    if (!municipalityOrUniqueRegionalId) {
      return await this.getReportEditionGroupedByCounty(params)
    }

    const queryBuilder = this.reportEditionRepository
      .createQueryBuilder('ReportEdition')
      .addSelect(['ReportEdition.id'])
      .addSelect(['test.TES_ID', 'TES_DIS.DIS_ID', 'TES_DIS.DIS_NOME'])
      .innerJoin('ReportEdition.edition', 'edition')
      .innerJoinAndSelect(
        'ReportEdition.reports_descriptors',
        'reports_descriptors',
      )
      .innerJoin('reports_descriptors.test', 'test')
      .innerJoinAndSelect('reports_descriptors.descriptor', 'descriptor')
      .innerJoinAndSelect('test.TES_DIS', 'TES_DIS')
      .innerJoin('test.TES_SER', 'TES_SER', `TES_SER.SER_ID = :serie`, {
        serie,
      })
      .andWhere('edition.AVA_ANO = :year', { year })
      .andWhere('edition.AVA_ID = :assessmentId', {
        assessmentId: edition,
      })

    if (typeSchool) {
      queryBuilder.andWhere('ReportEdition.type = :type', {
        type: typeSchool,
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

    const report = await queryBuilder.getOne()

    return {
      report,
    }
  }

  private async getReportEditionGroupedByCounty({
    year,
    edition,
    serie,
    typeSchool,
    stateRegionalId,
    county,
    stateId,
    verifyProfileForState,
  }: PaginationParams) {
    const queryBuilder = this.reportEditionRepository
      .createQueryBuilder('ReportEdition')
      .select([
        'report_descriptor.testTESID as testId',
        'report_descriptor.descriptorMTIID as descriptorId',
        'SUM(report_descriptor.total) as total',
        'SUM(report_descriptor.totalCorrect) as totalCorrect',
      ])
      .addSelect([
        'TES_DIS.DIS_ID as subjectId',
        'TES_DIS.DIS_TIPO as subjectType',
        'TES_DIS.DIS_NOME as subjectName',
        'TES_DIS.DIS_COLOR as subjectColor',
      ])
      .innerJoin(
        'report_descriptor',
        'report_descriptor',
        'ReportEdition.id = report_descriptor.reportEditionId',
      )
      .innerJoin('report_descriptor.test', 'test', 'test.TES_SER = :serieId', {
        serieId: serie,
      })
      .innerJoin('test.TES_DIS', 'TES_DIS')
      .innerJoin('ReportEdition.edition', 'edition')
      .innerJoin('ReportEdition.county', 'county')
      .andWhere('edition.AVA_ANO = :year', { year })
      .andWhere('edition.AVA_ID = :assessmentId', {
        assessmentId: edition,
      })
      .groupBy(
        'report_descriptor.testTESID, ReportEdition.editionAVAID, report_descriptor.descriptorMTIID',
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
    } else {
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
      (reportEdition) => `${reportEdition.descriptorId}`,
    )

    const items = []
    Object.keys(reportEditionsGroupedByRegional).map(async (key) => {
      reportEditionsGroupedByRegional[key]?.forEach((report) => {
        const formatItem = {
          total: +report.total,
          totalCorrect: +report.totalCorrect,
          descriptor: {
            MTI_ID: report.descriptorId,
          },
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

        items.push(formatItem)
      })
    })

    return {
      report: {
        reports_descriptors: items,
      },
    }
  }

  async getTopicsBySerie(serieId: number) {
    const topics = await this.headquartersRepository
      .createQueryBuilder('Headquarters')
      .select([
        'Headquarters.MAR_ID',
        'MAR_DIS.DIS_ID',
        'MAR_DIS.DIS_NOME',
        'MAR_MTO.MTO_ID',
        'MAR_MTO.MTO_NOME',
        'MTO_MTI.MTI_ID',
        'MTO_MTI.MTI_CODIGO',
        'MTO_MTI.MTI_DESCRITOR',
      ])
      .innerJoin('Headquarters.MAR_DIS', 'MAR_DIS')
      .innerJoin('Headquarters.MAR_MTO', 'MAR_MTO')
      .innerJoin('MAR_MTO.MTO_MTI', 'MTO_MTI')
      .innerJoin(
        'Headquarters.MAR_SER',
        'MAR_SER',
        'MAR_SER.SER_ID = :serieId',
        {
          serieId,
        },
      )
      .getMany()

    return {
      topics,
    }
  }
}
