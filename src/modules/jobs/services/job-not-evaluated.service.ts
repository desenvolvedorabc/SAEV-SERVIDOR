import { Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { InjectRepository } from '@nestjs/typeorm'
import * as _ from 'lodash'
import { TypeAssessmentEnum } from 'src/modules/assessment/model/enum/type-assessment.enum'
import { StudentTest } from 'src/modules/release-results/model/entities/student-test.entity'
import { ReportEdition } from 'src/modules/reports/model/entities/report-edition.entity'
import { ReportNotEvaluated } from 'src/modules/reports/model/entities/report-not-evaluated.entity'
import { ReportsService } from 'src/modules/reports/service/reports.service'
import { Test } from 'src/modules/test/model/entities/test.entity'
import { Repository } from 'typeorm'

import { JobNotEvaluatedRepository } from './repositories/job-not-evaluated.repository'

@Injectable()
export class JobNotEvaluatedService {
  constructor(
    @InjectRepository(ReportNotEvaluated)
    private readonly reportNotEvaluatedRepository: Repository<ReportNotEvaluated>,

    private readonly reportsService: ReportsService,
    private readonly jobNotEvaluatedRepository: JobNotEvaluatedRepository,
  ) {}

  async generateByCounty(
    assessmentId: number,
    countyId: number,
    type: TypeAssessmentEnum,
  ) {
    const reportNotEvaluated =
      await this.jobNotEvaluatedRepository.getMunicipalityRegionalByCounty(
        assessmentId,
        countyId,
        type,
      )

    const reportNotEvaluatedGroupedByCounty = _.groupBy(
      reportNotEvaluated,
      (reportNotEvaluated) =>
        `${reportNotEvaluated.MUN_ID} ${reportNotEvaluated.assessmentId}`,
    )

    await Promise.all(
      Object.keys(reportNotEvaluatedGroupedByCounty).map(async (key) => {
        const reportEdition = reportNotEvaluatedGroupedByCounty[key][0]

        const newReportEdition =
          await this.reportsService.upsertReportEditionByAssessmentId(
            reportEdition.assessmentId,
            { county: { MUN_ID: reportEdition.MUN_ID }, type },
            ['reports_not_evaluated'],
          )

        await Promise.all(
          reportNotEvaluatedGroupedByCounty[key].map(
            async (rollupReportEdition) => {
              const reportNotEvaluated =
                this.reportNotEvaluatedRepository.create({
                  type: rollupReportEdition.type,
                  name: rollupReportEdition.name,
                  test: { TES_ID: rollupReportEdition.testTESID },
                  countTotalStudents: rollupReportEdition.countTotalStudents,
                  countStudentsLaunched:
                    rollupReportEdition.countStudentsLaunched,
                  countPresentStudents:
                    rollupReportEdition.countPresentStudents,
                  recusa: rollupReportEdition.recusa,
                  ausencia: rollupReportEdition.ausencia,
                  abandono: rollupReportEdition.abandono,
                  transferencia: rollupReportEdition.transferencia,
                  deficiencia: rollupReportEdition.deficiencia,
                  nao_participou: rollupReportEdition.nao_participou,
                  reportEdition: newReportEdition,
                })

              await this.reportNotEvaluatedRepository.save(reportNotEvaluated)
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
    const reportNotEvaluated =
      await this.jobNotEvaluatedRepository.getReportNotEvaluatedGroupedByTestAndSchoolClass(
        assessmentId,
        countyId,
        type,
      )

    const reportNotEvaluatedGroupedBySchool = _.groupBy(
      reportNotEvaluated,
      (reportNotEvaluated) =>
        `${reportNotEvaluated.ESC_ID} ${reportNotEvaluated.assessmentId}`,
    )

    await Promise.all(
      Object.keys(reportNotEvaluatedGroupedBySchool).map(async (key) => {
        const reportNotEvaluated = reportNotEvaluatedGroupedBySchool[key][0]
        const newReportEdition =
          await this.reportsService.upsertReportEditionByAssessmentId(
            reportNotEvaluated.assessmentId,
            { school: { ESC_ID: reportNotEvaluated.ESC_ID }, type },
            ['reports_not_evaluated'],
          )

        await Promise.all(
          reportNotEvaluatedGroupedBySchool[key].map(
            async (rollupReportEdition) => {
              const reportNotEvaluated =
                this.reportNotEvaluatedRepository.create({
                  type: rollupReportEdition.type,
                  name: rollupReportEdition.name,
                  test: { TES_ID: rollupReportEdition.testTESID },
                  countTotalStudents: rollupReportEdition.countTotalStudents,
                  countStudentsLaunched:
                    rollupReportEdition.countStudentsLaunched,
                  countPresentStudents:
                    rollupReportEdition.countPresentStudents,
                  recusa: rollupReportEdition.recusa,
                  ausencia: rollupReportEdition.ausencia,
                  abandono: rollupReportEdition.abandono,
                  transferencia: rollupReportEdition.transferencia,
                  deficiencia: rollupReportEdition.deficiencia,
                  nao_participou: rollupReportEdition.nao_participou,
                  reportEdition: newReportEdition,
                })

              await this.reportNotEvaluatedRepository.save(reportNotEvaluated)
            },
          ),
        )
      }),
    )
  }

  async generateByMunicipalityRegional(
    assessmentId: number,
    countyId: number,
    type: TypeAssessmentEnum,
  ) {
    const reportEditions =
      await this.jobNotEvaluatedRepository.getReportEditionGroupedByMunicipalityRegional(
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
            ['reports_not_evaluated'],
          )

        await Promise.all(
          reportEditionsGroupedByRegional[key].map(
            async (rollupReportEdition) => {
              const reportNotEvaluated =
                this.reportNotEvaluatedRepository.create({
                  type: rollupReportEdition.type,
                  name: rollupReportEdition.name,
                  test: { TES_ID: rollupReportEdition.testTESID },
                  countTotalStudents: rollupReportEdition.countTotalStudents,
                  countStudentsLaunched:
                    rollupReportEdition.countStudentsLaunched,
                  countPresentStudents:
                    rollupReportEdition.countPresentStudents,
                  recusa: rollupReportEdition.recusa,
                  ausencia: rollupReportEdition.ausencia,
                  abandono: rollupReportEdition.abandono,
                  transferencia: rollupReportEdition.transferencia,
                  deficiencia: rollupReportEdition.deficiencia,
                  nao_participou: rollupReportEdition.nao_participou,
                  reportEdition: newReportEdition,
                })

              await this.reportNotEvaluatedRepository.save(reportNotEvaluated)
            },
          ),
        )
      }),
    )
  }

  @OnEvent('job-subject.created', { async: true })
  async generateBySchoolClass({
    exam,
    ids,
    reportEdition,
    studentSubmissions,
    totalStudents,
  }: {
    totalStudents: number
    exam: Test
    reportEdition: ReportEdition
    studentSubmissions: StudentTest[]
    ids: string[]
  }) {
    const totalNotEvaluated = studentSubmissions?.reduce(
      (prev: any, cur: StudentTest) => {
        prev.totalLaunched++
        if (
          cur.ALT_FINALIZADO ||
          cur.ANSWERS_TEST?.length ||
          !cur.ALT_JUSTIFICATIVA.trim()
        ) {
          prev.totalPresent++
          return prev
        }

        const options = {
          'Recusou-se a participar': 'recusa',
          'Faltou mas está Frequentando a escola': 'ausencia',
          'Abandonou a escola': 'abandono',
          'Foi Transferido para outra escola': 'transferencia',
          'Não participou por motivo de deficiência': 'deficiencia',
          'Motivos de deficiência': 'deficiencia',
          'Não participou': 'nao_participou',
        }

        const option = cur.ALT_JUSTIFICATIVA.trim()
        prev[options[option]] = prev[options[option]] + 1

        return prev
      },
      {
        recusa: 0,
        ausencia: 0,
        abandono: 0,
        transferencia: 0,
        deficiencia: 0,
        nao_participou: 0,
        totalLaunched: 0,
        totalPresent: 0,
      },
    )

    const reportNotEvaluated = this.reportNotEvaluatedRepository.create({
      ...totalNotEvaluated,
      type: exam.TES_DIS.DIS_TIPO,
      name: exam.TES_DIS.DIS_NOME,
      test: exam,
      countTotalStudents: totalStudents,
      countStudentsLaunched: studentSubmissions?.length,
      countPresentStudents: totalNotEvaluated?.totalPresent,
      reportEdition,
      idStudents: ids,
    })

    await this.reportNotEvaluatedRepository.save(reportNotEvaluated)
  }
}
