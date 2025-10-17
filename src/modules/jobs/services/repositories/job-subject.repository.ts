import { Injectable } from '@nestjs/common'
import { InjectConnection, InjectRepository } from '@nestjs/typeorm'
import { TypeAssessmentEnum } from 'src/modules/assessment/model/enum/type-assessment.enum'
import { ReportEdition } from 'src/modules/reports/model/entities/report-edition.entity'
import { Test } from 'src/modules/test/model/entities/test.entity'
import { Connection, Repository } from 'typeorm'

@Injectable()
export class JobSubjectRepository {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(ReportEdition)
    private readonly reportEditionsRepository: Repository<ReportEdition>,
  ) {}

  async getCountyReportEditions(assessmentId: number) {
    return this.reportEditionsRepository
      .createQueryBuilder('REPORT_EDITION')
      .select([
        'REPORT_EDITION.editionAVAID as assessmentId',
        'REPORT_SUBJECT.testTESID',
        'REPORT_SUBJECT.type as type',
        'REPORT_SUBJECT.name as name',
        'SUM(REPORT_SUBJECT.countTotalStudents) as countTotalStudents',
        'SUM(REPORT_SUBJECT.countStudentsLaunched) as countStudentsLaunched',
        'SUM(REPORT_SUBJECT.totalGradesStudents) as totalGradesStudents',
        'SUM(REPORT_SUBJECT.countPresentStudents) as countPresentStudents',
        'SUM(REPORT_SUBJECT.fluente) as fluente',
        'SUM(REPORT_SUBJECT.nao_fluente) as nao_fluente',
        'SUM(REPORT_SUBJECT.frases) as frases',
        'SUM(REPORT_SUBJECT.palavras) as palavras',
        'SUM(REPORT_SUBJECT.silabas) as silabas',
        'SUM(REPORT_SUBJECT.nao_leitor) as nao_leitor',
        'SUM(REPORT_SUBJECT.nao_avaliado) as nao_avaliado',
        'SUM(REPORT_SUBJECT.nao_informado) as nao_informado',
      ])
      .innerJoin(
        'report_subject',
        'REPORT_SUBJECT',
        'REPORT_EDITION.id = REPORT_SUBJECT.reportEditionId',
      )
      .innerJoin(
        'municipio',
        'MUNICIPIO',
        'MUNICIPIO.MUN_ID = REPORT_EDITION.countyMUNID',
      )
      .where('REPORT_EDITION.countyMUNID IS NOT NULL')
      .andWhere('REPORT_EDITION.type = :type', {
        type: TypeAssessmentEnum.MUNICIPAL,
      })
      .andWhere('MUNICIPIO.MUN_PARCEIRO_EPV IS TRUE')
      .andWhere('REPORT_EDITION.editionAVAID = :assessmentId', { assessmentId })
      .groupBy('REPORT_SUBJECT.testTESID, REPORT_EDITION.editionAVAID')
      .getRawMany()
  }

  async getMunicipalityRegionalReportEditions(
    assessmentId: number,
    countyId: number,
    type: TypeAssessmentEnum,
  ) {
    return await this.reportEditionsRepository
      .createQueryBuilder('REPORT_EDITION')
      .select([
        'REPORT_EDITION.editionAVAID as assessmentId',
        'REGIONAL.countyId as MUN_ID',
        'REPORT_SUBJECT.testTESID as testTESID',
        'REPORT_SUBJECT.type as type',
        'REPORT_SUBJECT.name as name',
        'SUM(REPORT_SUBJECT.countTotalStudents) as countTotalStudents',
        'SUM(REPORT_SUBJECT.countStudentsLaunched) as countStudentsLaunched',
        'SUM(REPORT_SUBJECT.totalGradesStudents) as totalGradesStudents',
        'SUM(REPORT_SUBJECT.countPresentStudents) as countPresentStudents',
        'SUM(REPORT_SUBJECT.fluente) as fluente',
        'SUM(REPORT_SUBJECT.nao_fluente) as nao_fluente',
        'SUM(REPORT_SUBJECT.frases) as frases',
        'SUM(REPORT_SUBJECT.palavras) as palavras',
        'SUM(REPORT_SUBJECT.silabas) as silabas',
        'SUM(REPORT_SUBJECT.nao_leitor) as nao_leitor',
        'SUM(REPORT_SUBJECT.nao_avaliado) as nao_avaliado',
        'SUM(REPORT_SUBJECT.nao_informado) as nao_informado',
      ])
      .innerJoin(
        'report_subject',
        'REPORT_SUBJECT',
        'REPORT_EDITION.id = REPORT_SUBJECT.reportEditionId',
      )
      .innerJoin(
        'regionais',
        'REGIONAL',
        'REGIONAL.id = REPORT_EDITION.regionalId',
      )
      .andWhere('REPORT_EDITION.type = :type', { type })
      .andWhere('REPORT_SUBJECT.countTotalStudents > 0')
      .andWhere('REGIONAL.countyId = :countyId', { countyId })
      .andWhere('REGIONAL.active IS TRUE')
      .andWhere('REPORT_EDITION.editionAVAID = :assessmentId', { assessmentId })
      .groupBy(
        'REPORT_SUBJECT.testTESID, REGIONAL.countyId, REPORT_EDITION.editionAVAID',
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
        'REPORT_SUBJECT.testTESID',
        'REPORT_EDITION.schoolClassTURID',
        'TURMA.TUR_SER_ID as SER_ID',
        'REPORT_SUBJECT.name as name',
        'REPORT_SUBJECT.type as type',
        'SUM(REPORT_SUBJECT.countTotalStudents) as countTotalStudents',
        'SUM(REPORT_SUBJECT.countStudentsLaunched) as countStudentsLaunched',
        'SUM(REPORT_SUBJECT.totalGradesStudents) as totalGradesStudents',
        'SUM(REPORT_SUBJECT.countPresentStudents) as countPresentStudents',
        'SUM(REPORT_SUBJECT.fluente) as fluente',
        'SUM(REPORT_SUBJECT.nao_fluente) as nao_fluente',
        'SUM(REPORT_SUBJECT.frases) as frases',
        'SUM(REPORT_SUBJECT.palavras) as palavras',
        'SUM(REPORT_SUBJECT.silabas) as silabas',
        'SUM(REPORT_SUBJECT.nao_leitor) as nao_leitor',
        'SUM(REPORT_SUBJECT.nao_avaliado) as nao_avaliado',
        'SUM(REPORT_SUBJECT.nao_informado) as nao_informado',
      ])
      .innerJoin(
        'report_subject',
        'REPORT_SUBJECT',
        'REPORT_EDITION.id = REPORT_SUBJECT.reportEditionId',
      )
      .innerJoin(
        'turma',
        'TURMA',
        'TURMA.TUR_ID = REPORT_EDITION.schoolClassTURID AND TURMA.TUR_MUN_ID = :countyId',
        { countyId },
      )
      .where('REPORT_EDITION.type = :type', { type })
      .andWhere('REPORT_EDITION.editionAVAID = :assessmentId', { assessmentId })
      .andWhere('REPORT_SUBJECT.countTotalStudents > 0')
      .groupBy(
        'REPORT_SUBJECT.testTESID, TURMA.TUR_ESC_ID, REPORT_EDITION.editionAVAID',
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
        'REPORT_SUBJECT.testTESID as testTESID',
        'REPORT_SUBJECT.type as type',
        'REPORT_SUBJECT.name as name',
        'SUM(REPORT_SUBJECT.countTotalStudents) as countTotalStudents',
        'SUM(REPORT_SUBJECT.countStudentsLaunched) as countStudentsLaunched',
        'SUM(REPORT_SUBJECT.totalGradesStudents) as totalGradesStudents',
        'SUM(REPORT_SUBJECT.countPresentStudents) as countPresentStudents',
        'SUM(REPORT_SUBJECT.fluente) as fluente',
        'SUM(REPORT_SUBJECT.nao_fluente) as nao_fluente',
        'SUM(REPORT_SUBJECT.frases) as frases',
        'SUM(REPORT_SUBJECT.palavras) as palavras',
        'SUM(REPORT_SUBJECT.silabas) as silabas',
        'SUM(REPORT_SUBJECT.nao_leitor) as nao_leitor',
        'SUM(REPORT_SUBJECT.nao_avaliado) as nao_avaliado',
        'SUM(REPORT_SUBJECT.nao_informado) as nao_informado',
      ])
      .innerJoin(
        'report_subject',
        'REPORT_SUBJECT',
        'REPORT_EDITION.id = REPORT_SUBJECT.reportEditionId',
      )
      .innerJoin(
        'escola',
        'ESCOLA',
        'ESCOLA.ESC_ID = REPORT_EDITION.schoolESCID',
      )
      .andWhere('REPORT_SUBJECT.countTotalStudents > 0')
      .andWhere('ESCOLA.regionalId IS NOT NULL')
      .andWhere('ESCOLA.ESC_MUN_ID = :countyId', { countyId })
      .andWhere('REPORT_EDITION.type = :type', { type })
      .andWhere('REPORT_EDITION.editionAVAID = :assessmentId', { assessmentId })
      .groupBy(
        'REPORT_SUBJECT.testTESID, ESCOLA.regionalId, REPORT_EDITION.editionAVAID',
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
