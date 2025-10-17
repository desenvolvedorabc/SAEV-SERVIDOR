import { Injectable } from '@nestjs/common'
import { InjectConnection, InjectRepository } from '@nestjs/typeorm'
import * as _ from 'lodash'
import { PaginationParams } from 'src/helpers/params'
import { Assessment } from 'src/modules/assessment/model/entities/assessment.entity'
import { StudentTest } from 'src/modules/release-results/model/entities/student-test.entity'
import { TypeSchoolEnum } from 'src/modules/school/model/enum/type-school.enum'
import { Student } from 'src/modules/student/model/entities/student.entity'
import { Connection, Repository } from 'typeorm'

import { selectDefaultReportNotEvaluated } from '../constants/default-selects'
import { ReportEdition } from '../model/entities/report-edition.entity'

@Injectable()
export class NotEvaluatedRepository {
  constructor(
    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,

    @InjectRepository(ReportEdition)
    private reportEditionRepository: Repository<ReportEdition>,

    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async getExamsBySerieAndEdition(assessmentId: number, serieId: number) {
    const assessment = await this.assessmentRepository
      .createQueryBuilder('Assessment')
      .select([
        'Assessment.AVA_ID',
        'AVA_TES.TES_ID',
        'AVA_TES.TES_NOME',
        'TES_DIS.DIS_NOME',
        'TES_DIS.DIS_TIPO',
      ])
      .innerJoinAndSelect('Assessment.AVA_TES', 'AVA_TES')
      .leftJoinAndSelect('AVA_TES.TES_DIS', 'TES_DIS')
      .andWhere('AVA_TES.TES_SER_ID = :serieId', { serieId })
      .andWhere('Assessment.AVA_ID = :assessmentId', {
        assessmentId,
      })
      .getOne()

    const exams = assessment?.AVA_TES ?? []

    return {
      exams,
    }
  }

  async getDataReport(params: PaginationParams) {
    const {
      edition,
      serie,
      typeSchool,
      school,
      municipalityOrUniqueRegionalId,
      county,
      verifyProfileForState,
    } = params

    if (!county) {
      const { items } = await this.getReportEditionGroupedByParams(params)

      return {
        reports: items,
      }
    }

    const queryBuilder = this.reportEditionRepository
      .createQueryBuilder('ReportEdition')
      .addSelect(['ReportEdition.id'])
      .addSelect(['test.TES_ID'])
      .innerJoinAndSelect(
        'ReportEdition.reports_not_evaluated',
        'reports_not_evaluated',
      )
      .innerJoin('reports_not_evaluated.test', 'test')
      .where('ReportEdition.editionAVAID = :assessmentId', {
        assessmentId: edition,
      })
      .andWhere(
        'reports_not_evaluated.countStudentsLaunched >= reports_not_evaluated.countPresentStudents',
      )
      .andWhere('test.TES_SER = :serieId', { serieId: serie })

    if (typeSchool) {
      queryBuilder.andWhere('ReportEdition.type = :type', {
        type: typeSchool,
      })
    }

    if (school) {
      queryBuilder
        .addSelect(['schoolClass.TUR_ID', 'schoolClass.TUR_NOME'])
        .innerJoin('ReportEdition.schoolClass', 'schoolClass')
        .innerJoin('schoolClass.TUR_MUN', 'county')
        .andWhere('schoolClass.TUR_ESC_ID = :schoolId', {
          schoolId: school,
        })
    } else if (municipalityOrUniqueRegionalId) {
      queryBuilder
        .addSelect(['school.ESC_ID', 'school.ESC_NOME', 'school.ESC_TIPO'])
        .innerJoin('ReportEdition.school', 'school')
        .innerJoin('school.ESC_MUN', 'county')
        .andWhere('school.regionalId = :municipalityOrUniqueRegionalId', {
          municipalityOrUniqueRegionalId,
        })
    } else if (county) {
      queryBuilder
        .addSelect(['regional.id', 'regional.name'])
        .innerJoin('ReportEdition.regional', 'regional')
        .innerJoin('regional.county', 'county')
        .andWhere('regional.countyId = :countyId', {
          countyId: county,
        })
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

  async getReportEditionGroupedByParams({
    edition,
    serie,
    stateId,
    stateRegionalId,
    typeSchool,
    verifyProfileForState,
  }: PaginationParams) {
    const queryBuilder = this.connection
      .getRepository(ReportEdition)
      .createQueryBuilder('ReportEdition')
      .select(selectDefaultReportNotEvaluated)
      .addSelect([
        'TES_DIS.DIS_ID as subjectId',
        'TES_DIS.DIS_NOME as subjectName',
      ])
      .innerJoin(
        'report_not_evaluated',
        'REPORT_NOT_EVALUATED',
        'ReportEdition.id = REPORT_NOT_EVALUATED.reportEditionId',
      )
      .innerJoin(
        'REPORT_NOT_EVALUATED.test',
        'test',
        'test.TES_SER IN (:series)',
        {
          series: serie?.split(','),
        },
      )
      .innerJoin('test.TES_DIS', 'TES_DIS')
      .andWhere('ReportEdition.editionAVAID = :assessmentId', {
        assessmentId: edition,
      })

    if (typeSchool) {
      queryBuilder.andWhere('ReportEdition.type = :type', { type: typeSchool })
    }

    if (stateRegionalId) {
      queryBuilder
        .addSelect([
          'county.MUN_ID as id',
          'county.MUN_NOME as name',
          'county.MUN_UF as countyUf',
        ])
        .innerJoin(
          'regionais',
          'REGIONAL',
          'REGIONAL.id = ReportEdition.regionalId',
        )
        .innerJoin(
          'REGIONAL.county',
          'county',
          'county.stateRegionalId = :stateRegionalId',
          { stateRegionalId },
        )
        .groupBy('test.TES_ID, REGIONAL.countyId, ReportEdition.editionAVAID')
    } else if (stateId) {
      queryBuilder
        .addSelect(['stateRegional.id as id', 'stateRegional.name as name'])
        .innerJoin(
          'municipio',
          'county',
          'county.MUN_ID = ReportEdition.countyMUNID',
        )
        .innerJoin('county.stateRegional', 'stateRegional')
        .andWhere('county.stateId = :stateId', { stateId })
        .groupBy(
          'REPORT_NOT_EVALUATED.testTESID, county.stateRegionalId, ReportEdition.editionAVAID',
        )
    } else {
      queryBuilder
        .addSelect([
          'county.MUN_ID as id',
          'county.MUN_NOME as name',
          'county.MUN_UF as countyUf',
        ])
        .innerJoin(
          'municipio',
          'county',
          'county.MUN_ID = ReportEdition.countyMUNID',
        )
        .andWhere('county.MUN_PARCEIRO_EPV IS TRUE')
        .groupBy(
          'test.TES_ID, ReportEdition.countyMUNID, ReportEdition.editionAVAID',
        )
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
        county: {
          MUN_ID: reportEdition?.id,
          MUN_NOME: reportEdition?.name,
          MUN_UF: reportEdition?.countyUf,
        },
        regional: {
          id: reportEdition?.id,
          name: reportEdition?.name,
        },
        reports_not_evaluated: reportEditionsGroupedByRegional[key]?.map(
          (report) => {
            return {
              ...report,
              test: {
                TES_ID: report.testId,
                TES_DIS: {
                  DIS_ID: report?.subjectId,
                  DIS_NOME: report?.subjectName,
                },
              },
            }
          },
        ),
      }

      items.push(formatItem)
    })

    return {
      items,
    }
  }

  async getInfoStudent(
    studentId: number,
    testId: number,
    schoolClassId: number,
  ) {
    const student = await this.connection
      .getRepository(Student)
      .createQueryBuilder('Student')
      .select(['Student.ALU_ID', 'Student.ALU_NOME'])
      .where('Student.ALU_ID = :studentId', { studentId })
      .getOne()

    const studentTest = await this.connection
      .getRepository(StudentTest)
      .createQueryBuilder('StudentTest')
      .where(
        `StudentTest.ALT_ALU_ID = '${studentId}' AND StudentTest.ALT_TES_ID = '${testId}'`,
      )
      .andWhere('StudentTest.schoolClass = :schoolClassId', {
        schoolClassId,
      })
      .getOne()

    return {
      student,
      studentTest,
    }
  }
}
