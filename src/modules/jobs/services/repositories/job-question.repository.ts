import { Injectable } from '@nestjs/common'
import { InjectConnection } from '@nestjs/typeorm'
import { TypeAssessmentEnum } from 'src/modules/assessment/model/enum/type-assessment.enum'
import { ReportEdition } from 'src/modules/reports/model/entities/report-edition.entity'
import { Connection } from 'typeorm'

@Injectable()
export class JobQuestionRepository {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async generateBySchool(
    schoolId: number,
    testId: number,
    type: TypeAssessmentEnum,
  ) {
    const data = await this.connection
      .getRepository(ReportEdition)
      .createQueryBuilder('REPORT_EDITION')
      .select([
        'report_question.option_correct as option_correct',
        'report_question.questionTEGID as questionId',
        'SUM(report_question.total_a) as total_a',
        'SUM(report_question.total_b) as total_b',
        'SUM(report_question.total_c) as total_c',
        'SUM(report_question.total_d) as total_d',
        'SUM(report_question.total_null) as total_null',
        'SUM(report_question.fluente) as fluente',
        'SUM(report_question.nao_fluente) as nao_fluente',
        'SUM(report_question.frases) as frases',
        'SUM(report_question.palavras) as palavras',
        'SUM(report_question.silabas) as silabas',
        'SUM(report_question.nao_leitor) as nao_leitor',
        'SUM(report_question.nao_avaliado) as nao_avaliado',
        'SUM(report_question.nao_informado) as nao_informado',
      ])
      .innerJoin(
        'report_subject',
        'REPORT_SUBJECT',
        'REPORT_EDITION.id = REPORT_SUBJECT.reportEditionId',
      )
      .innerJoin(
        'report_question',
        'report_question',
        'REPORT_SUBJECT.id = report_question.reportSubjectId',
      )
      .innerJoin(
        'turma',
        'TURMA',
        'TURMA.TUR_ID = REPORT_EDITION.schoolClassTURID AND TURMA.TUR_ESC_ID = :schoolId',
        { schoolId },
      )
      .where('REPORT_EDITION.type = :type', { type })
      .andWhere('REPORT_SUBJECT.testTESID = :testId', { testId })
      .groupBy('report_question.questionTEGID')
      .getRawMany()

    return data
  }

  async generateByMunicipalityRegional(
    regionalId: number,
    testId: number,
    type: TypeAssessmentEnum,
  ) {
    const data = await this.connection
      .getRepository(ReportEdition)
      .createQueryBuilder('REPORT_EDITION')
      .select([
        'report_question.option_correct as option_correct',
        'report_question.questionTEGID as questionId',
        'SUM(report_question.total_a) as total_a',
        'SUM(report_question.total_b) as total_b',
        'SUM(report_question.total_c) as total_c',
        'SUM(report_question.total_d) as total_d',
        'SUM(report_question.total_null) as total_null',
        'SUM(report_question.fluente) as fluente',
        'SUM(report_question.nao_fluente) as nao_fluente',
        'SUM(report_question.frases) as frases',
        'SUM(report_question.palavras) as palavras',
        'SUM(report_question.silabas) as silabas',
        'SUM(report_question.nao_leitor) as nao_leitor',
        'SUM(report_question.nao_avaliado) as nao_avaliado',
        'SUM(report_question.nao_informado) as nao_informado',
      ])
      .innerJoin(
        'report_subject',
        'REPORT_SUBJECT',
        'REPORT_EDITION.id = REPORT_SUBJECT.reportEditionId',
      )
      .innerJoin(
        'report_question',
        'report_question',
        'REPORT_SUBJECT.id = report_question.reportSubjectId',
      )
      .innerJoin(
        'escola',
        'ESCOLA',
        'ESCOLA.ESC_ID = REPORT_EDITION.schoolESCID',
      )
      .where('REPORT_EDITION.type = :type', { type })
      .andWhere('ESCOLA.regionalId = :regionalId', { regionalId })
      .andWhere('REPORT_SUBJECT.testTESID = :testId', { testId })
      .groupBy('report_question.questionTEGID')
      .getRawMany()

    return data
  }

  async generateByCounty(
    countyId: number,
    testId: number,
    type: TypeAssessmentEnum,
  ) {
    const data = await this.connection
      .getRepository(ReportEdition)
      .createQueryBuilder('REPORT_EDITION')
      .select([
        'report_question.option_correct as option_correct',
        'report_question.questionTEGID as questionId',
        'SUM(report_question.total_a) as total_a',
        'SUM(report_question.total_b) as total_b',
        'SUM(report_question.total_c) as total_c',
        'SUM(report_question.total_d) as total_d',
        'SUM(report_question.total_null) as total_null',
        'SUM(report_question.fluente) as fluente',
        'SUM(report_question.nao_fluente) as nao_fluente',
        'SUM(report_question.frases) as frases',
        'SUM(report_question.palavras) as palavras',
        'SUM(report_question.silabas) as silabas',
        'SUM(report_question.nao_leitor) as nao_leitor',
        'SUM(report_question.nao_avaliado) as nao_avaliado',
        'SUM(report_question.nao_informado) as nao_informado',
      ])
      .innerJoin(
        'report_subject',
        'REPORT_SUBJECT',
        'REPORT_EDITION.id = REPORT_SUBJECT.reportEditionId',
      )
      .innerJoin(
        'report_question',
        'report_question',
        'REPORT_SUBJECT.id = report_question.reportSubjectId',
      )
      .innerJoin(
        'regionais',
        'REGIONAL',
        'REGIONAL.id = REPORT_EDITION.regionalId',
      )
      .where('REPORT_EDITION.type = :type', { type })
      .andWhere('REGIONAL.countyId = :countyId', { countyId })
      .andWhere('REGIONAL.active IS TRUE')
      .andWhere('REPORT_SUBJECT.testTESID = :testId', { testId })
      .groupBy('report_question.questionTEGID')
      .getRawMany()

    return data
  }
}
