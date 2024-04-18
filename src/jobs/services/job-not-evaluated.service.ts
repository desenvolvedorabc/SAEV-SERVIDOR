import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import * as _ from "lodash";
import { Connection, Repository } from "typeorm";
import { ReportNotEvaluated } from "src/reports/model/entities/report-not-evaluated.entity";
import { StudentTest } from "src/release-results/model/entities/student-test.entity";
import { ReportEdition } from "src/reports/model/entities/report-edition.entity";
import { ReportsService } from "src/reports/service/reports.service";
import { Test } from "src/test/model/entities/test.entity";

@Injectable()
export class JobNotEvaluatedService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(ReportEdition)
    private readonly reportEditionsRepository: Repository<ReportEdition>,

    @InjectRepository(ReportNotEvaluated)
    private readonly reportNotEvaluatedRepository: Repository<ReportNotEvaluated>,

    private readonly reportsService: ReportsService,
  ) {}

  async generateReportEditionsByEdition(assessmentId: number) {
    const reportNotEvaluated = await this.getCountyReportNotEvaluated(
      assessmentId,
    );

    const reportNotEvaluatedGrouppedByEdition = _.groupBy(
      reportNotEvaluated,
      (reportNotEvaluated) => reportNotEvaluated.assessmentId,
    );

    await Promise.all(
      Object.keys(reportNotEvaluatedGrouppedByEdition).map(async (key) => {
        const reportEdition = reportNotEvaluatedGrouppedByEdition[key][0];

        const newReportEdition =
          await this.reportsService.upsertReportEditionByAssessmentId(
            reportEdition.assessmentId,
            { county: null, schoolClass: null, school: null },
            ["reports_not_evaluated"],
          );

        await Promise.all(
          reportNotEvaluatedGrouppedByEdition[key].map(
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
                });

              await this.reportNotEvaluatedRepository.save(reportNotEvaluated);
            },
          ),
        );
      }),
    );
  }

  private getCountyReportNotEvaluated(assessmentId: number) {
    return this.reportEditionsRepository
      .createQueryBuilder("REPORT_EDITION")
      .select([
        "REPORT_EDITION.editionAVAID as assessmentId",
        "REPORT_NOT_EVALUATED.testTESID",
        "REPORT_NOT_EVALUATED.type as type",
        "REPORT_NOT_EVALUATED.name as name",
        "SUM(REPORT_NOT_EVALUATED.countTotalStudents) as countTotalStudents",
        "SUM(REPORT_NOT_EVALUATED.countStudentsLaunched) as countStudentsLaunched",
        "SUM(REPORT_NOT_EVALUATED.countPresentStudents) as countPresentStudents",
        "SUM(REPORT_NOT_EVALUATED.recusa) as recusa",
        "SUM(REPORT_NOT_EVALUATED.ausencia) as ausencia",
        "SUM(REPORT_NOT_EVALUATED.abandono) as abandono",
        "SUM(REPORT_NOT_EVALUATED.transferencia) as transferencia",
        "SUM(REPORT_NOT_EVALUATED.deficiencia) as deficiencia",
        "SUM(REPORT_NOT_EVALUATED.nao_participou) as nao_participou",
      ])
      .innerJoin(
        "report_not_evaluated",
        "REPORT_NOT_EVALUATED",
        "REPORT_EDITION.id = REPORT_NOT_EVALUATED.reportEditionId",
      )
      .where("REPORT_EDITION.countyMUNID IS NOT NULL")
      .andWhere("REPORT_NOT_EVALUATED.countTotalStudents > 0")
      .andWhere("REPORT_EDITION.editionAVAID = :assessmentId", { assessmentId })
      .groupBy("REPORT_NOT_EVALUATED.testTESID, REPORT_EDITION.editionAVAID")
      .getRawMany();
  }

  async generateReportEditionsByCounty(assessmentId: number, countyId: number) {
    const reportNotEvaluated = await this.getSchoolNotEvaluatedReportEditions(
      assessmentId,
      countyId,
    );

    const reportNotEvaluatedGrouppedByCounty = _.groupBy(
      reportNotEvaluated,
      (reportNotEvaluated) =>
        `${reportNotEvaluated.MUN_ID} ${reportNotEvaluated.assessmentId}`,
    );

    await Promise.all(
      Object.keys(reportNotEvaluatedGrouppedByCounty).map(async (key) => {
        const reportEdition = reportNotEvaluatedGrouppedByCounty[key][0];

        const newReportEdition =
          await this.reportsService.upsertReportEditionByAssessmentId(
            reportEdition.assessmentId,
            { county: { MUN_ID: reportEdition.MUN_ID } },
            ["reports_not_evaluated"],
          );

        await Promise.all(
          reportNotEvaluatedGrouppedByCounty[key].map(
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
                });

              await this.reportNotEvaluatedRepository.save(reportNotEvaluated);
            },
          ),
        );
      }),
    );
  }

  private async getSchoolNotEvaluatedReportEditions(
    assessmentId: number,
    countyId: number,
  ) {
    return this.reportEditionsRepository
      .createQueryBuilder("REPORT_EDITION")
      .select([
        "REPORT_EDITION.editionAVAID as assessmentId",
        "ESCOLA.ESC_MUN_ID as MUN_ID",
        "test.TES_ID as testTESID",
        "test.TES_SER_ID as SER_ID",
        "REPORT_NOT_EVALUATED.type as type",
        "REPORT_NOT_EVALUATED.name as name",
        "SUM(REPORT_NOT_EVALUATED.countTotalStudents) as countTotalStudents",
        "SUM(REPORT_NOT_EVALUATED.countStudentsLaunched) as countStudentsLaunched",
        "SUM(REPORT_NOT_EVALUATED.countPresentStudents) as countPresentStudents",
        "SUM(REPORT_NOT_EVALUATED.recusa) as recusa",
        "SUM(REPORT_NOT_EVALUATED.ausencia) as ausencia",
        "SUM(REPORT_NOT_EVALUATED.abandono) as abandono",
        "SUM(REPORT_NOT_EVALUATED.transferencia) as transferencia",
        "SUM(REPORT_NOT_EVALUATED.deficiencia) as deficiencia",
        "SUM(REPORT_NOT_EVALUATED.nao_participou) as nao_participou",
      ])
      .innerJoin(
        "report_not_evaluated",
        "REPORT_NOT_EVALUATED",
        "REPORT_EDITION.id = REPORT_NOT_EVALUATED.reportEditionId",
      )
      .innerJoin(
        "escola",
        "ESCOLA",
        "ESCOLA.ESC_ID = REPORT_EDITION.schoolESCID",
      )
      .innerJoin("REPORT_NOT_EVALUATED.test", "test")
      .where("REPORT_EDITION.schoolESCID IS NOT NULL")
      .andWhere("REPORT_EDITION.schoolClassTURID IS NULL")
      .andWhere("REPORT_NOT_EVALUATED.countTotalStudents > 0")
      .andWhere("ESCOLA.ESC_MUN_ID = :countyId", { countyId })
      .andWhere("REPORT_EDITION.editionAVAID = :assessmentId", { assessmentId })
      .groupBy("test.TES_ID, ESCOLA.ESC_MUN_ID, REPORT_EDITION.editionAVAID")
      .getRawMany();
  }

  async generateReportEditionsBySchool(assessmentId: number, countyId: number) {
    const reportNotEvaluated =
      await this.getReportNotEvaluatedGrouppedByTestAndSchoolClass(
        assessmentId,
        countyId,
      );

    const reportNotEvaluatedGrouppedBySchool = _.groupBy(
      reportNotEvaluated,
      (reportNotEvaluated) =>
        `${reportNotEvaluated.ESC_ID} ${reportNotEvaluated.assessmentId}`,
    );

    await Promise.all(
      Object.keys(reportNotEvaluatedGrouppedBySchool).map(async (key) => {
        const reportNotEvaluated = reportNotEvaluatedGrouppedBySchool[key][0];
        const newReportEdition =
          await this.reportsService.upsertReportEditionByAssessmentId(
            reportNotEvaluated.assessmentId,
            { school: { ESC_ID: reportNotEvaluated.ESC_ID } },
            ["reports_not_evaluated"],
          );

        await Promise.all(
          reportNotEvaluatedGrouppedBySchool[key].map(
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
                });

              await this.reportNotEvaluatedRepository.save(reportNotEvaluated);
            },
          ),
        );
      }),
    );
  }

  private async getReportNotEvaluatedGrouppedByTestAndSchoolClass(
    assessmentId: number,
    countyId: number,
  ) {
    return this.reportEditionsRepository
      .createQueryBuilder("REPORT_EDITION")
      .select([
        "REPORT_EDITION.editionAVAID as assessmentId",
        "TURMA.TUR_ESC_ID as ESC_ID",
        "REPORT_NOT_EVALUATED.testTESID",
        "REPORT_EDITION.schoolClassTURID",
        "TURMA.TUR_SER_ID as SER_ID",
        "REPORT_NOT_EVALUATED.name as name",
        "REPORT_NOT_EVALUATED.type as type",
        "SUM(REPORT_NOT_EVALUATED.countTotalStudents) as countTotalStudents",
        "SUM(REPORT_NOT_EVALUATED.countStudentsLaunched) as countStudentsLaunched",
        "SUM(REPORT_NOT_EVALUATED.countPresentStudents) as countPresentStudents",
        "SUM(REPORT_NOT_EVALUATED.recusa) as recusa",
        "SUM(REPORT_NOT_EVALUATED.ausencia) as ausencia",
        "SUM(REPORT_NOT_EVALUATED.abandono) as abandono",
        "SUM(REPORT_NOT_EVALUATED.transferencia) as transferencia",
        "SUM(REPORT_NOT_EVALUATED.deficiencia) as deficiencia",
        "SUM(REPORT_NOT_EVALUATED.nao_participou) as nao_participou",
      ])
      .innerJoin(
        "report_not_evaluated",
        "REPORT_NOT_EVALUATED",
        "REPORT_EDITION.id = REPORT_NOT_EVALUATED.reportEditionId",
      )
      .innerJoin(
        "turma",
        "TURMA",
        "TURMA.TUR_ID = REPORT_EDITION.schoolClassTURID AND TURMA.TUR_MUN_ID = :countyId",
        { countyId },
      )
      .where("REPORT_EDITION.schoolClassTURID IS NOT NULL")
      .andWhere("REPORT_EDITION.editionAVAID = :assessmentId", { assessmentId })
      .andWhere("REPORT_NOT_EVALUATED.countTotalStudents > 0")
      .groupBy(
        "REPORT_NOT_EVALUATED.testTESID, TURMA.TUR_ESC_ID, REPORT_EDITION.editionAVAID",
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

 async generateReportSubjectBySchoolClass(
    totalStudents: number,
    exam: Test,
    reportEdition: ReportEdition,
    studentSubmissions: StudentTest[],
    ids: string[],
  ) {
    let reportNotEvaluated;

    const totalNotEvaluated = studentSubmissions?.reduce(
      (prev: any, cur: StudentTest) => {
        prev.totalLaunched++;
        if (
          cur.ALT_FINALIZADO ||
          cur.ANSWERS_TEST.length ||
          !cur.ALT_JUSTIFICATIVA.trim()
        ) {
          prev.totalPresent++;
          return prev;
        }

        const options = {
          "Recusou-se a participar": "recusa",
          "Faltou mas está Frequentando a escola": "ausencia",
          "Abandonou a escola": "abandono",
          "Foi Transferido para outra escola": "transferencia",
          "Não participou por motivo de deficiência": "deficiencia",
          "Motivos de deficiência": "deficiencia",
          "Não participou": "nao_participou",
        };

        const option = cur.ALT_JUSTIFICATIVA.trim();
        prev[options[option]] = prev[options[option]] + 1;

        return prev;
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
    );

    reportNotEvaluated = this.reportNotEvaluatedRepository.create({
      ...totalNotEvaluated,
      type: exam.TES_DIS.DIS_TIPO,
      name: exam.TES_DIS.DIS_NOME,
      test: exam,
      countTotalStudents: totalStudents,
      countStudentsLaunched: studentSubmissions?.length,
      countPresentStudents: totalNotEvaluated?.totalPresent,
      reportEdition: reportEdition,
      idStudents: ids,
    });

    await this.reportNotEvaluatedRepository.save(reportNotEvaluated);
  }
}
