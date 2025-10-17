import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { PaginationParams } from 'src/helpers/params'
import { TypeSchoolEnum } from 'src/modules/school/model/enum/type-school.enum'
import { Serie } from 'src/modules/serie/model/entities/serie.entity'
import { Repository } from 'typeorm'

import { ReportEdition } from '../model/entities/report-edition.entity'
import { GeneralSynthesisRepository } from './general-synthesis.repository'

@Injectable()
export class ReleasesRepository {
  constructor(
    @InjectRepository(ReportEdition)
    private reportEditionRepository: Repository<ReportEdition>,

    @InjectRepository(Serie)
    private seriesClassRepository: Repository<Serie>,

    private readonly generalSynthesisRepository: GeneralSynthesisRepository,
  ) {}

  async getDataReports(paginationParams: PaginationParams) {
    const {
      county,
      year,
      serie,
      typeSchool,
      edition,
      school,
      municipalityOrUniqueRegionalId,
      verifyProfileForState,
    } = paginationParams

    const series = await this.seriesClassRepository
      .createQueryBuilder('Series')
      .select(['Series.SER_ID', 'Series.SER_NOME'])
      .where('Series.SER_ID IN (:series)', {
        series: serie?.split(','),
      })
      .orderBy('Series.SER_NOME', 'ASC')
      .getMany()

    if (!county) {
      const { items: reports } =
        await this.generalSynthesisRepository.getReportEditionGroupedByParams(
          paginationParams,
        )

      return {
        series,
        reports,
      }
    }

    const queryBuilder = this.reportEditionRepository
      .createQueryBuilder('ReportEdition')
      .addSelect(['ReportEdition.id', 'test.TES_ID', 'TES_SER.SER_ID'])
      .innerJoin('ReportEdition.edition', 'edition')
      .innerJoinAndSelect(
        'ReportEdition.reportsSubjects',
        'reportsSubjects',
        'reportsSubjects.countTotalStudents > 0',
      )
      .innerJoin('reportsSubjects.test', 'test')
      .leftJoinAndSelect('test.TES_DIS', 'TES_DIS')
      .innerJoin('test.TES_SER', 'TES_SER', `TES_SER.SER_ID IN (:series)`, {
        series: serie?.split(','),
      })

    if (edition) {
      queryBuilder.andWhere('edition.AVA_ID = :assessmentId', {
        assessmentId: edition,
      })
    }

    if (year) {
      queryBuilder.andWhere('edition.AVA_ANO = :year', { year })
    }

    if (typeSchool) {
      queryBuilder.andWhere('ReportEdition.type = :type', {
        type: typeSchool,
      })
    }

    if (school) {
      queryBuilder
        .addSelect([
          'schoolClass.TUR_ID',
          'schoolClass.TUR_NOME',
          'TUR_SER.SER_NOME',
        ])
        .innerJoin('ReportEdition.schoolClass', 'schoolClass')
        .leftJoin('schoolClass.TUR_SER', 'TUR_SER')
        .innerJoin('schoolClass.TUR_MUN', 'county')
        .andWhere('schoolClass.TUR_ESC_ID = :schoolId', {
          schoolId: school,
        })
    } else if (municipalityOrUniqueRegionalId) {
      queryBuilder
        .addSelect([
          'school.ESC_ID',
          'school.ESC_NOME',
          'school.ESC_TIPO',
          'school.ESC_INEP',
        ])
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
      series,
      reports,
    }
  }
}
