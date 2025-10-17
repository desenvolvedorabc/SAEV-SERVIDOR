import { Injectable } from '@nestjs/common'
import { InjectConnection, InjectRepository } from '@nestjs/typeorm'
import { TypeAssessmentEnum } from 'src/modules/assessment/model/enum/type-assessment.enum'
import { ReportEdition } from 'src/modules/reports/model/entities/report-edition.entity'
import { Test } from 'src/modules/test/model/entities/test.entity'
import { Connection, Repository } from 'typeorm'

@Injectable()
export class JobDescriptorsRepository {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,

    @InjectRepository(ReportEdition)
    private readonly reportEditionsRepository: Repository<ReportEdition>,
  ) {}

  async getMunicipalityRegionalByCounty(
    assessmentId: number,
    countyId: number,
    type: TypeAssessmentEnum,
  ) {
    return this.reportEditionsRepository
      .createQueryBuilder('report_edition')
      .select([
        'report_edition.editionAVAID as assessmentId',
        'REGIONAL.countyId as MUN_ID',
        'report_descriptor.testTESID',
        'report_descriptor.descriptorMTIID',
        'SUM(report_descriptor.total) as total',
        'SUM(report_descriptor.totalCorrect) as totalCorrect',
      ])
      .innerJoin(
        'report_descriptor',
        'report_descriptor',
        'report_edition.id = report_descriptor.reportEditionId',
      )
      .innerJoin(
        'regionais',
        'REGIONAL',
        'REGIONAL.id = report_edition.regionalId',
      )
      .andWhere('report_edition.type = :type', { type })
      .andWhere('REGIONAL.countyId = :countyId', { countyId })
      .andWhere('REGIONAL.active IS TRUE')
      .andWhere('report_edition.editionAVAID = :assessmentId', { assessmentId })
      .groupBy(
        'report_descriptor.testTESID, REGIONAL.countyId, report_edition.editionAVAID, report_descriptor.descriptorMTIID',
      )
      .getRawMany()
  }

  async getReportEditionGroupedByTestAndSchoolClass(
    assessmentId: number,
    countyId: number,
    type: TypeAssessmentEnum,
  ) {
    return this.reportEditionsRepository
      .createQueryBuilder('REPORT_EDITION')
      .select([
        'REPORT_EDITION.editionAVAID as assessmentId',
        'TURMA.TUR_ESC_ID as ESC_ID',
        'report_descriptor.testTESID',
        'report_descriptor.descriptorMTIID',
        'SUM(report_descriptor.total) as total',
        'SUM(report_descriptor.totalCorrect) as totalCorrect',
      ])
      .innerJoin(
        'report_descriptor',
        'report_descriptor',
        'REPORT_EDITION.id = report_descriptor.reportEditionId',
      )
      .innerJoin(
        'turma',
        'TURMA',
        'TURMA.TUR_ID = REPORT_EDITION.schoolClassTURID AND TURMA.TUR_MUN_ID = :countyId',
        { countyId },
      )
      .where('REPORT_EDITION.type = :type', { type })
      .andWhere('REPORT_EDITION.editionAVAID = :assessmentId', { assessmentId })
      .groupBy(
        'report_descriptor.testTESID, TURMA.TUR_ESC_ID, REPORT_EDITION.editionAVAID, report_descriptor.descriptorMTIID',
      )
      .getRawMany()
  }

  async getReportEditionGroupedByMunicipalityRegional(
    assessmentId: number,
    countyId: number,
    type: TypeAssessmentEnum,
  ) {
    return this.reportEditionsRepository
      .createQueryBuilder('REPORT_EDITION')
      .select([
        'REPORT_EDITION.editionAVAID as assessmentId',
        'ESCOLA.regionalId as regionalId',
        'report_descriptor.testTESID as testTESID',
        'report_descriptor.descriptorMTIID',
        'SUM(report_descriptor.total) as total',
        'SUM(report_descriptor.totalCorrect) as totalCorrect',
      ])
      .innerJoin(
        'report_descriptor',
        'report_descriptor',
        'REPORT_EDITION.id = report_descriptor.reportEditionId',
      )
      .innerJoin(
        'escola',
        'ESCOLA',
        'ESCOLA.ESC_ID = REPORT_EDITION.schoolESCID',
      )
      .andWhere('ESCOLA.regionalId IS NOT NULL')
      .andWhere('ESCOLA.ESC_MUN_ID = :countyId', { countyId })
      .andWhere('REPORT_EDITION.type = :type', { type })
      .andWhere('REPORT_EDITION.editionAVAID = :assessmentId', { assessmentId })
      .groupBy(
        'report_descriptor.testTESID, ESCOLA.regionalId, REPORT_EDITION.editionAVAID, report_descriptor.descriptorMTIID',
      )
      .getRawMany()
  }

  async getExamsByAssessmentId(assessmentId: string) {
    return await this.connection
      .getRepository<Test>(Test)
      .createQueryBuilder('TESTE')
      .innerJoin(
        'avaliacao_teste',
        'AVALIACAO_TESTE',
        'AVALIACAO_TESTE.AVA_ID = :assessmentId AND AVALIACAO_TESTE.TES_ID = TESTE.TES_ID',
        { assessmentId },
      )
      .innerJoinAndSelect(
        'TESTE.TES_SER',
        'SERIE',
        'TESTE.TES_SER_ID = SERIE.SER_ID',
      )
      .innerJoinAndSelect('TESTE.TES_DIS', 'TES_DIS')
      .getMany()
  }
}
