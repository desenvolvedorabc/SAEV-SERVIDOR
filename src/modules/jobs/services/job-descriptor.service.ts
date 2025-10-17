import { Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { InjectConnection, InjectRepository } from '@nestjs/typeorm'
import * as _ from 'lodash'
import { TypeAssessmentEnum } from 'src/modules/assessment/model/enum/type-assessment.enum'
import { HeadquarterTopicItem } from 'src/modules/headquarters/model/entities/headquarter-topic-item.entity'
import { StudentTest } from 'src/modules/release-results/model/entities/student-test.entity'
import { ReportDescriptor } from 'src/modules/reports/model/entities/report-descriptor.entity'
import { ReportEdition } from 'src/modules/reports/model/entities/report-edition.entity'
import { ReportsService } from 'src/modules/reports/service/reports.service'
import { SubjectTypeEnum } from 'src/modules/subject/model/enum/subject-type.enum'
import { Test } from 'src/modules/test/model/entities/test.entity'
import { Connection, Repository } from 'typeorm'

import { JobDescriptorsRepository } from './repositories/job-descriptor.repository'

@Injectable()
export class JobDescriptorsService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,

    @InjectRepository(ReportDescriptor)
    private readonly reportDescriptorRepository: Repository<ReportDescriptor>,

    private readonly reportsService: ReportsService,

    private readonly jobDescriptorsRepository: JobDescriptorsRepository,
  ) {}

  async generateByCounty(
    assessmentId: number,
    countyId: number,
    type: TypeAssessmentEnum,
  ) {
    const reportEditions =
      await this.jobDescriptorsRepository.getMunicipalityRegionalByCounty(
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
            ['reports_descriptors'],
          )

        await Promise.all(
          reportEditionsGroupedByCounty[key].map(
            async (rollupReportEdition) => {
              const reportDescriptor = this.reportDescriptorRepository.create({
                test: { TES_ID: rollupReportEdition.testTESID },
                report_edition: newReportEdition,
                total: rollupReportEdition.total,
                totalCorrect: rollupReportEdition.totalCorrect,
                descriptor: rollupReportEdition.descriptorMTIID,
              })

              await this.reportDescriptorRepository.save(reportDescriptor)
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
      await this.jobDescriptorsRepository.getReportEditionGroupedByTestAndSchoolClass(
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
            ['reports_descriptors'],
          )

        await Promise.all(
          reportEditionsGroupedBySchool[key].map(
            async (rollupReportEdition) => {
              const reportDescriptor = this.reportDescriptorRepository.create({
                test: { TES_ID: rollupReportEdition.testTESID },
                report_edition: newReportEdition,
                total: rollupReportEdition.total,
                totalCorrect: rollupReportEdition.totalCorrect,
                descriptor: rollupReportEdition.descriptorMTIID,
              })

              await this.reportDescriptorRepository.save(reportDescriptor)
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
      await this.jobDescriptorsRepository.getReportEditionGroupedByMunicipalityRegional(
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
            ['reports_descriptors'],
          )

        await Promise.all(
          reportEditionsGroupedByRegional[key].map(
            async (rollupReportEdition) => {
              const reportDescriptor = this.reportDescriptorRepository.create({
                test: { TES_ID: rollupReportEdition.testTESID },
                report_edition: newReportEdition,
                total: rollupReportEdition.total,
                totalCorrect: rollupReportEdition.totalCorrect,
                descriptor: rollupReportEdition.descriptorMTIID,
              })

              await this.reportDescriptorRepository.save(reportDescriptor)
            },
          ),
        )
      }),
    )
  }

  @OnEvent('job-subject.created', { async: true })
  async generateReportDescriptorBySchoolClass({
    exam,
    reportEdition,
    studentSubmissions,
  }: {
    exam: Test
    reportEdition: ReportEdition
    studentSubmissions: StudentTest[]
  }) {
    if (exam.TES_DIS.DIS_TIPO !== SubjectTypeEnum.OBJETIVA) {
      return
    }

    if (!studentSubmissions?.length) {
      return
    }

    const descriptors = await this.connection
      .getRepository(HeadquarterTopicItem)
      .createQueryBuilder('Descriptors')
      .select(['Descriptors.MTI_ID'])
      .innerJoin('Descriptors.MTI_MTO', 'MTI_MTO')
      .innerJoin('MTI_MTO.MTO_MAR', 'MTO_MAR')
      .innerJoin('MTO_MAR.MAR_DIS', 'MAR_DIS')
      .where('MAR_DIS.DIS_ID  = :id', { id: exam.TES_DIS.DIS_ID })
      .getMany()

    for (const descriptor of descriptors) {
      let countTotal = 0
      let countCorrect = 0

      studentSubmissions?.forEach((student) => {
        const ANSWERS_TEST = student?.ANSWERS_TEST?.filter(
          (arr, index, self) =>
            index ===
            self.findIndex(
              (t) =>
                t?.questionTemplate?.TEG_ID === arr?.questionTemplate?.TEG_ID,
            ),
        )

        ANSWERS_TEST?.forEach((answer) => {
          if (
            answer?.questionTemplate?.TEG_MTI?.MTI_ID === descriptor?.MTI_ID
          ) {
            countTotal++

            if (answer?.ATR_CERTO) {
              countCorrect++
            }
          }
        })
      })

      if (countTotal) {
        const reportDescriptor = this.reportDescriptorRepository.create({
          test: exam,
          report_edition: reportEdition,
          total: countTotal,
          totalCorrect: countCorrect,
          descriptor,
        })

        await this.reportDescriptorRepository.save(reportDescriptor)
      }
    }
  }
}
