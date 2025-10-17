import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import * as _ from 'lodash'
import { TypeAssessmentEnum } from 'src/modules/assessment/model/enum/type-assessment.enum'
import { Repository } from 'typeorm'

import { ReportEdition } from '../../reports/model/entities/report-edition.entity'
import { ReportSubject } from '../../reports/model/entities/report-subject.entity'
import { ReportsService } from '../../reports/service/reports.service'
import { JobQuestionService } from './job-question.service'
import { JobRaceService } from './job-race.service'
import { JobSubjectRepository } from './repositories/job-subject.repository'

@Injectable()
export class JobSubjectService {
  constructor(
    @InjectRepository(ReportEdition)
    private readonly reportEditionsRepository: Repository<ReportEdition>,

    @InjectRepository(ReportSubject)
    private readonly reportSubjectsRepository: Repository<ReportSubject>,

    private readonly reportsService: ReportsService,
    private readonly jobRaceService: JobRaceService,
    private readonly jobQuestionService: JobQuestionService,
    private readonly jobSubjectRepository: JobSubjectRepository,
  ) {}

  async generateByCounty(
    assessmentId: number,
    countyId: number,
    type: TypeAssessmentEnum,
  ) {
    const reportEditions =
      await this.jobSubjectRepository.getMunicipalityRegionalReportEditions(
        assessmentId,
        countyId,
        type,
      )

    const reportEditionsGroupedByCounty = _.groupBy(
      reportEditions,
      (reportEdition) =>
        `${reportEdition.MUN_ID} ${reportEdition.assessmentId}`,
    )

    await Promise.all(
      Object.keys(reportEditionsGroupedByCounty).map(async (key) => {
        const reportEdition = reportEditionsGroupedByCounty[key][0]

        const newReportEdition =
          await this.reportsService.upsertReportEditionByAssessmentId(
            reportEdition.assessmentId,
            { county: { MUN_ID: reportEdition.MUN_ID }, type },
            ['reportsSubjects'],
          )

        await Promise.all(
          reportEditionsGroupedByCounty[key].map(
            async (rollupReportEdition) => {
              const reportSubject = this.reportSubjectsRepository.create({
                type: rollupReportEdition.type,
                name: rollupReportEdition.name,
                test: { TES_ID: rollupReportEdition.testTESID },
                countTotalStudents: rollupReportEdition.countTotalStudents,
                countStudentsLaunched:
                  rollupReportEdition.countStudentsLaunched,
                totalGradesStudents: rollupReportEdition.totalGradesStudents,
                countPresentStudents: rollupReportEdition.countPresentStudents,
                fluente: rollupReportEdition.fluente,
                nao_fluente: rollupReportEdition.nao_fluente,
                frases: rollupReportEdition.frases,
                palavras: rollupReportEdition.palavras,
                silabas: rollupReportEdition.silabas,
                nao_leitor: rollupReportEdition.nao_leitor,
                nao_avaliado: rollupReportEdition.nao_avaliado,
                nao_informado: rollupReportEdition.nao_informado,
                reportEdition: newReportEdition,
              })

              await this.reportSubjectsRepository.save(reportSubject)
              await this.jobRaceService.generateReportEditionsByCounty(
                countyId,
                rollupReportEdition.testTESID,
                reportSubject.id,
                type,
              )

              await this.jobQuestionService.generateByCounty(
                countyId,
                rollupReportEdition.testTESID,
                reportSubject.id,
                type,
              )
            },
          ),
        )
      }),
    )
  }

  async generateBySchool(
    assessmentId: number,
    countyId: number,
    type: TypeAssessmentEnum,
  ) {
    const reportEditions =
      await this.jobSubjectRepository.getReportEditionGroupedByTestAndSchoolClass(
        assessmentId,
        countyId,
        type,
      )

    const reportEditionsGroupedBySchool = _.groupBy(
      reportEditions,
      (reportEdition) =>
        `${reportEdition.ESC_ID} ${reportEdition.assessmentId}`,
    )

    await Promise.all(
      Object.keys(reportEditionsGroupedBySchool).map(async (key) => {
        const reportEdition = reportEditionsGroupedBySchool[key][0]
        const newReportEdition =
          await this.reportsService.upsertReportEditionByAssessmentId(
            reportEdition.assessmentId,
            { school: { ESC_ID: reportEdition.ESC_ID }, type },
            ['reportsSubjects'],
          )

        await Promise.all(
          reportEditionsGroupedBySchool[key].map(
            async (rollupReportEdition) => {
              const reportSubject = this.reportSubjectsRepository.create({
                type: rollupReportEdition.type,
                name: rollupReportEdition.name,
                test: { TES_ID: rollupReportEdition.testTESID },
                countTotalStudents: rollupReportEdition.countTotalStudents,
                countStudentsLaunched:
                  rollupReportEdition.countStudentsLaunched,
                totalGradesStudents: rollupReportEdition.totalGradesStudents,
                countPresentStudents: rollupReportEdition.countPresentStudents,
                fluente: rollupReportEdition.fluente,
                nao_fluente: rollupReportEdition.nao_fluente,
                frases: rollupReportEdition.frases,
                palavras: rollupReportEdition.palavras,
                silabas: rollupReportEdition.silabas,
                nao_leitor: rollupReportEdition.nao_leitor,
                nao_avaliado: rollupReportEdition.nao_avaliado,
                nao_informado: rollupReportEdition.nao_informado,
                reportEdition: newReportEdition,
              })

              await this.reportSubjectsRepository.save(reportSubject)
              await this.jobRaceService.generateReportEditionsBySchool(
                reportEdition.ESC_ID,
                rollupReportEdition.testTESID,
                reportSubject.id,
                type,
              )

              await this.jobQuestionService.generateBySchool(
                reportEdition.ESC_ID,
                rollupReportEdition.testTESID,
                reportSubject.id,
                type,
              )
            },
          ),
        )
      }),
    )
  }

  async getReportEditionGroupedByStateRegional(
    assessmentId: number,
    stateId: number,
    type: TypeAssessmentEnum,
  ) {
    return this.reportEditionsRepository
      .createQueryBuilder('REPORT_EDITION')
      .select([
        'REPORT_EDITION.editionAVAID as assessmentId',
        'REPORT_SUBJECT.testTESID',
        'MUNICIPIO.stateRegionalId as regionalId',
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
      .andWhere('REPORT_EDITION.type = :type', { type })
      .andWhere('REPORT_SUBJECT.countTotalStudents > 0')
      .andWhere('MUNICIPIO.stateId = :stateId', { stateId })
      .andWhere('MUNICIPIO.MUN_COMPARTILHAR_DADOS IS TRUE')
      .andWhere('REPORT_EDITION.editionAVAID = :assessmentId', {
        assessmentId,
      })
      .groupBy(
        'REPORT_SUBJECT.testTESID, MUNICIPIO.stateRegionalId, REPORT_EDITION.editionAVAID',
      )
      .getRawMany()
  }

  async generateByMunicipalityRegional(
    assessmentId: number,
    countyId: number,
    type: TypeAssessmentEnum,
  ) {
    const reportEditions =
      await this.jobSubjectRepository.getReportEditionGroupedByMunicipalityRegional(
        assessmentId,
        countyId,
        type,
      )

    const reportEditionsGroupedByRegional = _.groupBy(
      reportEditions,
      (reportEdition) =>
        `${reportEdition.regionalId} ${reportEdition.assessmentId}`,
    )

    await Promise.all(
      Object.keys(reportEditionsGroupedByRegional).map(async (key) => {
        const reportEdition = reportEditionsGroupedByRegional[key][0]
        const newReportEdition =
          await this.reportsService.upsertReportEditionByAssessmentId(
            reportEdition.assessmentId,
            { regionalId: reportEdition.regionalId, type },
            ['reportsSubjects'],
          )

        await Promise.all(
          reportEditionsGroupedByRegional[key].map(
            async (rollupReportEdition) => {
              const reportSubject = this.reportSubjectsRepository.create({
                type: rollupReportEdition.type,
                name: rollupReportEdition.name,
                test: { TES_ID: rollupReportEdition.testTESID },
                countTotalStudents: rollupReportEdition.countTotalStudents,
                countStudentsLaunched:
                  rollupReportEdition.countStudentsLaunched,
                totalGradesStudents: rollupReportEdition.totalGradesStudents,
                countPresentStudents: rollupReportEdition.countPresentStudents,
                fluente: rollupReportEdition.fluente,
                nao_fluente: rollupReportEdition.nao_fluente,
                frases: rollupReportEdition.frases,
                palavras: rollupReportEdition.palavras,
                silabas: rollupReportEdition.silabas,
                nao_leitor: rollupReportEdition.nao_leitor,
                nao_avaliado: rollupReportEdition.nao_avaliado,
                nao_informado: rollupReportEdition.nao_informado,
                reportEdition: newReportEdition,
              })

              await this.reportSubjectsRepository.save(reportSubject)
              await this.jobRaceService.generateByMunicipalityRegional(
                reportEdition.regionalId,
                rollupReportEdition.testTESID,
                reportSubject.id,
                type,
              )

              await this.jobQuestionService.generateByMunicipalityRegional(
                reportEdition.regionalId,
                rollupReportEdition.testTESID,
                reportSubject.id,
                type,
              )
            },
          ),
        )
      }),
    )
  }
}
