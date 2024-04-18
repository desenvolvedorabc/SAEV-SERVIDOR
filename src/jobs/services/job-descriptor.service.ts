import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import * as _ from "lodash";
import { HeadquarterTopicItem } from "src/headquarters/model/entities/headquarter-topic-item.entity";
import { StudentTest } from "src/release-results/model/entities/student-test.entity";
import { ReportDescriptor } from "src/reports/model/entities/report-descriptor.entity";
import { ReportEdition } from "src/reports/model/entities/report-edition.entity";
import { ReportsService } from "src/reports/service/reports.service";
import { Test } from "src/test/model/entities/test.entity";
import { Connection, Repository } from "typeorm";

@Injectable()
export class JobDescriptorsService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(ReportEdition)
    private readonly reportEditionsRepository: Repository<ReportEdition>,

    @InjectRepository(ReportDescriptor)
    private readonly reportDescriptorRepository: Repository<ReportDescriptor>,

    private readonly reportsService: ReportsService,
  ) {}

  async generateReportEditionsWithReportsDescriptorsByEdition(
    assessmentId: number,
  ) {
    const reportEditions =
      await this.getCountyReportWithReportsDescriptorsEditions(assessmentId);

    const reportEditionsGrouppedByEdition = _.groupBy(
      reportEditions,
      (reportEdition) => reportEdition.assessmentId,
    );

    await Promise.all(
      Object.keys(reportEditionsGrouppedByEdition).map(async (key) => {
        const reportEdition = reportEditionsGrouppedByEdition[key][0];

        const newReportEdition =
          await this.reportsService.upsertReportEditionByAssessmentId(
            reportEdition.assessmentId,
            { county: null, schoolClass: null, school: null },
            ["reports_descriptors"],
          );

        await Promise.all(
          reportEditionsGrouppedByEdition[key].map(
            async (rollupReportEdition) => {
              const reportDescriptor = this.reportDescriptorRepository.create({
                test: { TES_ID: rollupReportEdition.testTESID },
                report_edition: newReportEdition,
                total: rollupReportEdition.total,
                totalCorrect: rollupReportEdition.totalCorrect,
                descriptor: rollupReportEdition.descriptorMTIID,
              });

              await this.reportDescriptorRepository.save(reportDescriptor);
            },
          ),
        );
      }),
    );
  }

  private getCountyReportWithReportsDescriptorsEditions(assessmentId: number) {
    return this.reportEditionsRepository
      .createQueryBuilder("report_edition")
      .select([
        "report_edition.editionAVAID as assessmentId",
        "report_descriptor.testTESID",
        "report_descriptor.descriptorMTIID",
        "SUM(report_descriptor.total) as total",
        "SUM(report_descriptor.totalCorrect) as totalCorrect",
      ])
      .innerJoin(
        "report_descriptor",
        "report_descriptor",
        "report_edition.id = report_descriptor.reportEditionId",
      )
      .where("report_edition.countyMUNID IS NOT NULL")
      .andWhere("report_edition.editionAVAID = :assessmentId", { assessmentId })
      .groupBy(
        "report_descriptor.testTESID, report_edition.editionAVAID, report_descriptor.descriptorMTIID",
      )
      .getRawMany();
  }

  async generateReportEditionsWithReportsDescriptorsByCounty(
    assessmentId: number,
    countyId: number,
  ) {
    const reportEditions =
      await this.getSchoolReportsWithReportDescriptorsEditions(
        assessmentId,
        countyId,
      );

    const reportEditionsGrouppedByCounty = _.groupBy(
      reportEditions,
      (reportEdition) =>
        `${reportEdition.MUN_ID} ${reportEdition.assessmentId}`,
    );

    await Promise.all(
      Object.keys(reportEditionsGrouppedByCounty).map(async (key) => {
        const reportEdition = reportEditionsGrouppedByCounty[key][0];

        const newReportEdition =
          await this.reportsService.upsertReportEditionByAssessmentId(
            reportEdition.assessmentId,
            { county: { MUN_ID: reportEdition.MUN_ID } },
            ["reports_descriptors"],
          );

        await Promise.all(
          reportEditionsGrouppedByCounty[key].map(
            async (rollupReportEdition) => {
              const reportDescriptor = this.reportDescriptorRepository.create({
                test: { TES_ID: rollupReportEdition.testTESID },
                report_edition: newReportEdition,
                total: rollupReportEdition.total,
                totalCorrect: rollupReportEdition.totalCorrect,
                descriptor: rollupReportEdition.descriptorMTIID,
              });

              await this.reportDescriptorRepository.save(reportDescriptor);
            },
          ),
        );
      }),
    );
  }

  private async getSchoolReportsWithReportDescriptorsEditions(
    assessmentId: number,
    countyId: number,
  ) {
    return this.reportEditionsRepository
      .createQueryBuilder("report_edition")
      .select([
        "report_edition.editionAVAID as assessmentId",
        "ESCOLA.ESC_MUN_ID as MUN_ID",
        "report_descriptor.testTESID",
        "report_descriptor.descriptorMTIID",
        "SUM(report_descriptor.total) as total",
        "SUM(report_descriptor.totalCorrect) as totalCorrect",
      ])
      .innerJoin(
        "report_descriptor",
        "report_descriptor",
        "report_edition.id = report_descriptor.reportEditionId",
      )
      .innerJoin(
        "escola",
        "ESCOLA",
        "ESCOLA.ESC_ID = report_edition.schoolESCID",
      )
      .where("report_edition.schoolESCID IS NOT NULL")
      .andWhere("report_edition.schoolClassTURID IS NULL")
      .andWhere("ESCOLA.ESC_MUN_ID = :countyId", { countyId })
      .andWhere("report_edition.editionAVAID = :assessmentId", { assessmentId })
      .groupBy(
        "report_descriptor.testTESID, ESCOLA.ESC_MUN_ID, report_edition.editionAVAID, report_descriptor.descriptorMTIID",
      )
      .getRawMany();
  }

  async generateReportEditionsWithReportDescriptorsBySchool(
    assessmentId: number,
    countyId: number,
  ) {
    const reportEditions =
      await this.getReportEditionWithReportDescriptorsGrouppedByTestAndSchoolClass(
        assessmentId,
        countyId,
      );

    const reportEditionsGrouppedBySchool = _.groupBy(
      reportEditions,
      (reportEdition) =>
        `${reportEdition.ESC_ID} ${reportEdition.assessmentId}`,
    );

    await Promise.all(
      Object.keys(reportEditionsGrouppedBySchool).map(async (key) => {
        const reportEdition = reportEditionsGrouppedBySchool[key][0];
        const newReportEdition =
          await this.reportsService.upsertReportEditionByAssessmentId(
            reportEdition.assessmentId,
            { school: { ESC_ID: reportEdition.ESC_ID } },
            ["reports_descriptors"],
          );

        await Promise.all(
          reportEditionsGrouppedBySchool[key].map(
            async (rollupReportEdition) => {
              const reportDescriptor = this.reportDescriptorRepository.create({
                test: { TES_ID: rollupReportEdition.testTESID },
                report_edition: newReportEdition,
                total: rollupReportEdition.total,
                totalCorrect: rollupReportEdition.totalCorrect,
                descriptor: rollupReportEdition.descriptorMTIID,
              });

              await this.reportDescriptorRepository.save(reportDescriptor);
            },
          ),
        );
      }),
    );
  }

  private async getReportEditionWithReportDescriptorsGrouppedByTestAndSchoolClass(
    assessmentId: number,
    countyId: number,
  ) {
    return this.reportEditionsRepository
      .createQueryBuilder("REPORT_EDITION")
      .select([
        "REPORT_EDITION.editionAVAID as assessmentId",
        "TURMA.TUR_ESC_ID as ESC_ID",
        "report_descriptor.testTESID",
        "report_descriptor.descriptorMTIID",
        "SUM(report_descriptor.total) as total",
        "SUM(report_descriptor.totalCorrect) as totalCorrect",
      ])
      .innerJoin(
        "report_descriptor",
        "report_descriptor",
        "REPORT_EDITION.id = report_descriptor.reportEditionId",
      )
      .innerJoin(
        "turma",
        "TURMA",
        "TURMA.TUR_ID = REPORT_EDITION.schoolClassTURID AND TURMA.TUR_MUN_ID = :countyId",
        { countyId },
      )
      .where("REPORT_EDITION.schoolClassTURID IS NOT NULL")
      .andWhere("REPORT_EDITION.editionAVAID = :assessmentId", { assessmentId })
      .groupBy(
        "report_descriptor.testTESID, TURMA.TUR_ESC_ID, REPORT_EDITION.editionAVAID, report_descriptor.descriptorMTIID",
      )
      .getRawMany();
  }

  async getExamsByAssessmentId(assessmentId: string) {
    return await this.connection
      .getRepository<Test>(Test)
      .createQueryBuilder("TESTE")
      .innerJoin(
        "avaliacao_teste",
        "AVALIACAO_TESTE",
        "AVALIACAO_TESTE.AVA_ID = :assessmentId AND AVALIACAO_TESTE.TES_ID = TESTE.TES_ID",
        { assessmentId },
      )
      .innerJoinAndSelect(
        "TESTE.TES_SER",
        "SERIE",
        "TESTE.TES_SER_ID = SERIE.SER_ID",
      )
      .innerJoinAndSelect("TESTE.TES_DIS", "TES_DIS")
      .getMany();
  }

  async generateReportDescriptorBySchoolClass(
    exam: Test,
    reportEdition: ReportEdition,
    studentSubmissions: StudentTest[],
  ) {
    const descriptors = await this.connection
      .getRepository(HeadquarterTopicItem)
      .createQueryBuilder("descriptor")
      .leftJoin("descriptor.MTI_MTO", "MTI_MTO")
      .leftJoin("MTI_MTO.MTO_MAR", "MTO_MAR")
      .leftJoin("MTO_MAR.MAR_DIS", "MAR_DIS")
      .where("MAR_DIS.DIS_ID  = :id", { id: exam.TES_DIS.DIS_ID })
      .getMany();

    for (const descriptor of descriptors) {
      let countTotal = 0;
      let countCorrect = 0;

      studentSubmissions?.forEach((student) => {
        const ANSWERS_TEST = student?.ANSWERS_TEST?.filter(
          (arr, index, self) =>
            index ===
            self.findIndex(
              (t) =>
                t?.questionTemplate?.TEG_ID === arr?.questionTemplate?.TEG_ID,
            ),
        );

        ANSWERS_TEST?.forEach((answer) => {
          if (
            answer?.questionTemplate?.TEG_MTI?.MTI_ID === descriptor?.MTI_ID
          ) {
            countTotal++;

            if (answer?.ATR_CERTO) {
              countCorrect++;
            }
          }
        });
      });

      if (countTotal) {
        const reportDescriptor = this.reportDescriptorRepository.create({
          test: exam,
          report_edition: reportEdition,
          total: countTotal,
          totalCorrect: countCorrect,
          descriptor,
        });

        await this.reportDescriptorRepository.save(reportDescriptor);
      }
    }
  }
}
