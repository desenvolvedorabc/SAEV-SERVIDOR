import { Injectable } from '@nestjs/common'
import { InjectConnection, InjectRepository } from '@nestjs/typeorm'
import { TypeAssessmentEnum } from 'src/modules/assessment/model/enum/type-assessment.enum'
import { ReportEdition } from 'src/modules/reports/model/entities/report-edition.entity'
import { Test } from 'src/modules/test/model/entities/test.entity'
import { Connection, Repository } from 'typeorm'

@Injectable()
export class JobNotEvaluatedRepository {
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
      .createQueryBuilder('REPORT_EDITION')
      .select([
        'REPORT_EDITION.editionAVAID as assessmentId',
        'REGIONAL.countyId as MUN_ID',
        'REPORT_NOT_EVALUATED.testTESID as testTESID',
        'REPORT_NOT_EVALUATED.type as type',
        'REPORT_NOT_EVALUATED.name as name',
        'SUM(REPORT_NOT_EVALUATED.countTotalStudents) as countTotalStudents',
        'SUM(REPORT_NOT_EVALUATED.countStudentsLaunched) as countStudentsLaunched',
        'SUM(REPORT_NOT_EVALUATED.countPresentStudents) as countPresentStudents',
        'SUM(REPORT_NOT_EVALUATED.recusa) as recusa',
        'SUM(REPORT_NOT_EVALUATED.ausencia) as ausencia',
        'SUM(REPORT_NOT_EVALUATED.abandono) as abandono',
        'SUM(REPORT_NOT_EVALUATED.transferencia) as transferencia',
        'SUM(REPORT_NOT_EVALUATED.deficiencia) as deficiencia',
        'SUM(REPORT_NOT_EVALUATED.nao_participou) as nao_participou',
      ])
      .innerJoin(
        'report_not_evaluated',
        'REPORT_NOT_EVALUATED',
        'REPORT_EDITION.id = REPORT_NOT_EVALUATED.reportEditionId',
      )
      .innerJoin(
        'regionais',
        'REGIONAL',
        'REGIONAL.id = REPORT_EDITION.regionalId',
      )
      .andWhere('REPORT_EDITION.type = :type', { type })
      .andWhere('REPORT_NOT_EVALUATED.countTotalStudents > 0')
      .andWhere('REGIONAL.countyId = :countyId', { countyId })
      .andWhere('REGIONAL.active IS TRUE')
      .andWhere('REPORT_EDITION.editionAVAID = :assessmentId', { assessmentId })
      .groupBy(
        'REPORT_NOT_EVALUATED.testTESID, REGIONAL.countyId, REPORT_EDITION.editionAVAID',
      )
      .getRawMany()
  }

  async getReportNotEvaluatedGroupedByTestAndSchoolClass(
    assessmentId: number,
    countyId: number,
    type: TypeAssessmentEnum,
  ) {
    return this.reportEditionsRepository
      .createQueryBuilder('REPORT_EDITION')
      .select([
        'REPORT_EDITION.editionAVAID as assessmentId',
        'TURMA.TUR_ESC_ID as ESC_ID',
        'REPORT_NOT_EVALUATED.testTESID',
        'REPORT_EDITION.schoolClassTURID',
        'REPORT_NOT_EVALUATED.name as name',
        'REPORT_NOT_EVALUATED.type as type',
        'SUM(REPORT_NOT_EVALUATED.countTotalStudents) as countTotalStudents',
        'SUM(REPORT_NOT_EVALUATED.countStudentsLaunched) as countStudentsLaunched',
        'SUM(REPORT_NOT_EVALUATED.countPresentStudents) as countPresentStudents',
        'SUM(REPORT_NOT_EVALUATED.recusa) as recusa',
        'SUM(REPORT_NOT_EVALUATED.ausencia) as ausencia',
        'SUM(REPORT_NOT_EVALUATED.abandono) as abandono',
        'SUM(REPORT_NOT_EVALUATED.transferencia) as transferencia',
        'SUM(REPORT_NOT_EVALUATED.deficiencia) as deficiencia',
        'SUM(REPORT_NOT_EVALUATED.nao_participou) as nao_participou',
      ])
      .innerJoin(
        'report_not_evaluated',
        'REPORT_NOT_EVALUATED',
        'REPORT_EDITION.id = REPORT_NOT_EVALUATED.reportEditionId',
      )
      .innerJoin(
        'turma',
        'TURMA',
        'TURMA.TUR_ID = REPORT_EDITION.schoolClassTURID AND TURMA.TUR_MUN_ID = :countyId',
        { countyId },
      )
      .where('REPORT_EDITION.type = :type', { type })
      .andWhere('REPORT_EDITION.editionAVAID = :assessmentId', { assessmentId })
      .andWhere('REPORT_NOT_EVALUATED.countTotalStudents > 0')
      .groupBy(
        'REPORT_NOT_EVALUATED.testTESID, TURMA.TUR_ESC_ID, REPORT_EDITION.editionAVAID',
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
        'REPORT_NOT_EVALUATED.testTESID as testTESID',
        'REPORT_NOT_EVALUATED.name as name',
        'REPORT_NOT_EVALUATED.type as type',
        'SUM(REPORT_NOT_EVALUATED.countTotalStudents) as countTotalStudents',
        'SUM(REPORT_NOT_EVALUATED.countStudentsLaunched) as countStudentsLaunched',
        'SUM(REPORT_NOT_EVALUATED.countPresentStudents) as countPresentStudents',
        'SUM(REPORT_NOT_EVALUATED.recusa) as recusa',
        'SUM(REPORT_NOT_EVALUATED.ausencia) as ausencia',
        'SUM(REPORT_NOT_EVALUATED.abandono) as abandono',
        'SUM(REPORT_NOT_EVALUATED.transferencia) as transferencia',
        'SUM(REPORT_NOT_EVALUATED.deficiencia) as deficiencia',
        'SUM(REPORT_NOT_EVALUATED.nao_participou) as nao_participou',
      ])
      .innerJoin(
        'report_not_evaluated',
        'REPORT_NOT_EVALUATED',
        'REPORT_EDITION.id = REPORT_NOT_EVALUATED.reportEditionId',
      )
      .innerJoin(
        'escola',
        'ESCOLA',
        'ESCOLA.ESC_ID = REPORT_EDITION.schoolESCID',
      )
      .andWhere('REPORT_NOT_EVALUATED.countTotalStudents > 0')
      .andWhere('ESCOLA.regionalId IS NOT NULL')
      .andWhere('ESCOLA.ESC_MUN_ID = :countyId', { countyId })
      .andWhere('REPORT_EDITION.type = :type', { type })
      .andWhere('REPORT_EDITION.editionAVAID = :assessmentId', { assessmentId })
      .groupBy(
        'REPORT_NOT_EVALUATED.testTESID, ESCOLA.regionalId, REPORT_EDITION.editionAVAID',
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
