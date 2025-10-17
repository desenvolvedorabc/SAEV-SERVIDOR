import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import * as _ from 'lodash'
import { PaginationParams } from 'src/helpers/params'
import { TypeSchoolEnum } from 'src/modules/school/model/enum/type-school.enum'
import { Repository } from 'typeorm'

import { selectDefaultReportQuestion } from '../constants/default-selects'
import { ReportEdition } from '../model/entities/report-edition.entity'

@Injectable()
export class ReportSyntheticRepository {
  constructor(
    @InjectRepository(ReportEdition)
    private reportEditionRepository: Repository<ReportEdition>,
  ) {}

  async getDataReports(paginationParams: PaginationParams) {
    const {
      edition,
      schoolClass,
      school,
      serie,
      municipalityOrUniqueRegionalId,
      typeSchool,
      verifyProfileForState,
    } = paginationParams

    if (!municipalityOrUniqueRegionalId) {
      return await this.getReportEditionGroupedByCounty(paginationParams)
    }

    const queryBuilder = this.reportEditionRepository
      .createQueryBuilder('ReportEdition')
      .addSelect(['ReportEdition.id'])
      .addSelect([
        'test.TES_ID',
        'reportsSubjects.id',
        'TES_DIS.DIS_ID',
        'TES_DIS.DIS_NOME',
        'TES_DIS.DIS_TIPO',
        'question.TEG_ID',
        'question.TEG_ORDEM',
        'TEG_MTI.MTI_DESCRITOR',
      ])
      .innerJoin('ReportEdition.reportsSubjects', 'reportsSubjects')
      .innerJoinAndSelect('reportsSubjects.reportQuestions', 'reportQuestions')
      .innerJoin('reportQuestions.question', 'question')
      .innerJoin('question.TEG_MTI', 'TEG_MTI')
      .innerJoin('reportsSubjects.test', 'test')
      .innerJoin('test.TES_DIS', 'TES_DIS')
      .where('ReportEdition.editionAVAID = :id', { id: edition })
      .andWhere('test.TES_SER = :serieId', { serieId: serie })

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

  async getReportEditionGroupedByCounty({
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
      .select(selectDefaultReportQuestion)
      .addSelect([
        'REPORT_SUBJECT.testTESID as testId',
        'TES_DIS.DIS_ID as subjectId',
        'TES_DIS.DIS_NOME as subjectName',
        'TES_DIS.DIS_TIPO as subjectType',
        'question.TEG_ORDEM as questionOrder',
        'TEG_MTI.MTI_DESCRITOR as descriptor',
      ])
      .innerJoin(
        'report_subject',
        'REPORT_SUBJECT',
        'ReportEdition.id = REPORT_SUBJECT.reportEditionId',
      )
      .innerJoin(
        'report_question',
        'report_question',
        'REPORT_SUBJECT.id = report_question.reportSubjectId',
      )
      .innerJoin('report_question.question', 'question')
      .innerJoin('question.TEG_MTI', 'TEG_MTI')
      .innerJoin('REPORT_SUBJECT.test', 'test', 'test.TES_SER = :serieId', {
        serieId: serie,
      })
      .innerJoin('test.TES_DIS', 'TES_DIS')

      .innerJoin('ReportEdition.county', 'county')
      .groupBy('report_question.questionTEGID, REPORT_SUBJECT.testTESID')
      .andWhere('ReportEdition.editionAVAID = :assessmentId', {
        assessmentId: edition,
      })

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
      (reportEdition) => `${reportEdition.testId}`,
    )

    const items = []
    Object.keys(reportEditionsGroupedByEdition)?.map(async (key, index) => {
      const reportSubject = reportEditionsGroupedByEdition[key][0]

      const formatItem = {
        id: index,
        test: {
          TES_ID: reportSubject?.testId,
          TES_DIS: {
            DIS_ID: reportSubject?.subjectId,
            DIS_NOME: reportSubject?.subjectName,
            DIS_TIPO: reportSubject?.subjectType,
          },
        },
        reportQuestions: reportEditionsGroupedByEdition[key]?.map((report) => {
          return {
            ...report,
            question: {
              TEG_ID: report?.questionId,
              TEG_ORDEM: report?.questionOrder,
              TEG_MTI: {
                MTI_DESCRITOR: report?.descriptor,
              },
            },
          }
        }),
      }

      items.push(formatItem)
    })

    return {
      report: {
        reportsSubjects: items,
      },
    }
  }
}
