import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import * as _ from "lodash";
import { Connection, Repository } from "typeorm";
import { ReportEdition } from "../../reports/model/entities/report-edition.entity";
import { ReportSubject } from "../../reports/model/entities/report-subject.entity";
import { ReportsService } from "../../reports/service/reports.service";
import { Test } from "../../test/model/entities/test.entity";
import { JobRaceService } from "./job-race.service";
// import { JobQuestionService } from "./job-question.service";

@Injectable()
export class JobSubjectService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(ReportEdition)
    private readonly reportEditionsRepository: Repository<ReportEdition>,
    @InjectRepository(ReportSubject)
    private readonly reportSubjectsRepository: Repository<ReportSubject>,

    private readonly reportsService: ReportsService,
    private readonly jobRaceService: JobRaceService,
    // private readonly jobQuestionService: JobQuestionService,
  ) {}

  async generateReportSubjectByEdition(assessmentId: number) {
    const reportEditions = await this.getCountyReportEditions(assessmentId);

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
            ["reportsSubjects"],
          );

        await Promise.all(
          reportEditionsGrouppedByEdition[key].map(
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
              });

              await this.reportSubjectsRepository.save(reportSubject);

              await this.jobRaceService.generateReportEditionsByEdition(
                assessmentId,
                rollupReportEdition.testTESID,
                reportSubject.id,
              );

              // await this.jobQuestionService.generateReportQuestionByEdition(
              //   assessmentId,
              //   rollupReportEdition.testTESID,
              //   reportSubject.id,
              // );
            },
          ),
        );
      }),
    );
  }

  private getCountyReportEditions(assessmentId: number) {
    return this.reportEditionsRepository
      .createQueryBuilder("REPORT_EDITION")
      .select([
        "REPORT_EDITION.editionAVAID as assessmentId",
        "REPORT_SUBJECT.testTESID",
        "REPORT_SUBJECT.type as type",
        "REPORT_SUBJECT.name as name",
        "SUM(REPORT_SUBJECT.countTotalStudents) as countTotalStudents",
        "SUM(REPORT_SUBJECT.countStudentsLaunched) as countStudentsLaunched",
        "SUM(REPORT_SUBJECT.totalGradesStudents) as totalGradesStudents",
        "SUM(REPORT_SUBJECT.countPresentStudents) as countPresentStudents",
        "SUM(REPORT_SUBJECT.fluente) as fluente",
        "SUM(REPORT_SUBJECT.nao_fluente) as nao_fluente",
        "SUM(REPORT_SUBJECT.frases) as frases",
        "SUM(REPORT_SUBJECT.palavras) as palavras",
        "SUM(REPORT_SUBJECT.silabas) as silabas",
        "SUM(REPORT_SUBJECT.nao_leitor) as nao_leitor",
        "SUM(REPORT_SUBJECT.nao_avaliado) as nao_avaliado",
        "SUM(REPORT_SUBJECT.nao_informado) as nao_informado",
      ])
      .innerJoin(
        "report_subject",
        "REPORT_SUBJECT",
        "REPORT_EDITION.id = REPORT_SUBJECT.reportEditionId",
      )
      .where("REPORT_EDITION.countyMUNID IS NOT NULL")
      .andWhere("REPORT_SUBJECT.countTotalStudents > 0")
      .andWhere("REPORT_EDITION.editionAVAID = :assessmentId", { assessmentId })
      .groupBy("REPORT_SUBJECT.testTESID, REPORT_EDITION.editionAVAID")
      .getRawMany();
  }

  async generateReportSubjectByCounty(assessmentId: number, countyId: number) {
    const reportEditions = await this.getSchoolReportEditions(
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
            ["reportsSubjects"],
          );

        await Promise.all(
          reportEditionsGrouppedByCounty[key].map(
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
              });

              await this.reportSubjectsRepository.save(reportSubject);
              await this.jobRaceService.generateReportEditionsByCounty(
                countyId,
                rollupReportEdition.testTESID,
                reportSubject.id,
              );

              // await this.jobQuestionService.generateReportQuestionByCounty(
              //   countyId,
              //   rollupReportEdition.testTESID,
              //   reportSubject.id,
              // );
            },
          ),
        );
      }),
    );
  }

  private async getSchoolReportEditions(
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
        "REPORT_SUBJECT.type as type",
        "REPORT_SUBJECT.name as name",
        "SUM(REPORT_SUBJECT.countTotalStudents) as countTotalStudents",
        "SUM(REPORT_SUBJECT.countStudentsLaunched) as countStudentsLaunched",
        "SUM(REPORT_SUBJECT.totalGradesStudents) as totalGradesStudents",
        "SUM(REPORT_SUBJECT.countPresentStudents) as countPresentStudents",
        "SUM(REPORT_SUBJECT.fluente) as fluente",
        "SUM(REPORT_SUBJECT.nao_fluente) as nao_fluente",
        "SUM(REPORT_SUBJECT.frases) as frases",
        "SUM(REPORT_SUBJECT.palavras) as palavras",
        "SUM(REPORT_SUBJECT.silabas) as silabas",
        "SUM(REPORT_SUBJECT.nao_leitor) as nao_leitor",
        "SUM(REPORT_SUBJECT.nao_avaliado) as nao_avaliado",
        "SUM(REPORT_SUBJECT.nao_informado) as nao_informado",
      ])
      .innerJoin(
        "report_subject",
        "REPORT_SUBJECT",
        "REPORT_EDITION.id = REPORT_SUBJECT.reportEditionId",
      )
      .innerJoin(
        "escola",
        "ESCOLA",
        "ESCOLA.ESC_ID = REPORT_EDITION.schoolESCID",
      )
      .innerJoin("REPORT_SUBJECT.test", "test")
      .where("REPORT_EDITION.schoolESCID IS NOT NULL")
      .andWhere("REPORT_EDITION.schoolClassTURID IS NULL")
      .andWhere("REPORT_SUBJECT.countTotalStudents > 0")
      .andWhere("ESCOLA.ESC_MUN_ID = :countyId", { countyId })
      .andWhere("REPORT_EDITION.editionAVAID = :assessmentId", { assessmentId })
      .groupBy("test.TES_ID, ESCOLA.ESC_MUN_ID, REPORT_EDITION.editionAVAID")
      .getRawMany();
  }

  async generateReportSubjectBySchool(assessmentId: number, countyId: number) {
    const reportEditions =
      await this.getReportEditionGrouppedByTestAndSchoolClass(
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
            ["reportsSubjects"],
          );

        await Promise.all(
          reportEditionsGrouppedBySchool[key].map(
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
              });

              await this.reportSubjectsRepository.save(reportSubject);
              await this.jobRaceService.generateReportEditionsBySchool(
                reportEdition.ESC_ID,
                rollupReportEdition.testTESID,
                reportSubject.id,
              );

              // await this.jobQuestionService.generateReportQuestionBySchool(
              //   reportEdition.ESC_ID,
              //   rollupReportEdition.testTESID,
              //   reportSubject.id,
              // );
            },
          ),
        );
      }),
    );
  }

  private async getReportEditionGrouppedByTestAndSchoolClass(
    assessmentId: number,
    countyId: number,
  ) {
    return this.reportEditionsRepository
      .createQueryBuilder("REPORT_EDITION")
      .select([
        "REPORT_EDITION.editionAVAID as assessmentId",
        "TURMA.TUR_ESC_ID as ESC_ID",
        "REPORT_SUBJECT.testTESID",
        "REPORT_EDITION.schoolClassTURID",
        "TURMA.TUR_SER_ID as SER_ID",
        "REPORT_SUBJECT.name as name",
        "REPORT_SUBJECT.type as type",
        "SUM(REPORT_SUBJECT.countTotalStudents) as countTotalStudents",
        "SUM(REPORT_SUBJECT.countStudentsLaunched) as countStudentsLaunched",
        "SUM(REPORT_SUBJECT.totalGradesStudents) as totalGradesStudents",
        "SUM(REPORT_SUBJECT.countPresentStudents) as countPresentStudents",
        "SUM(REPORT_SUBJECT.fluente) as fluente",
        "SUM(REPORT_SUBJECT.nao_fluente) as nao_fluente",
        "SUM(REPORT_SUBJECT.frases) as frases",
        "SUM(REPORT_SUBJECT.palavras) as palavras",
        "SUM(REPORT_SUBJECT.silabas) as silabas",
        "SUM(REPORT_SUBJECT.nao_leitor) as nao_leitor",
        "SUM(REPORT_SUBJECT.nao_avaliado) as nao_avaliado",
        "SUM(REPORT_SUBJECT.nao_informado) as nao_informado",
      ])
      .innerJoin(
        "report_subject",
        "REPORT_SUBJECT",
        "REPORT_EDITION.id = REPORT_SUBJECT.reportEditionId",
      )
      .innerJoin(
        "turma",
        "TURMA",
        "TURMA.TUR_ID = REPORT_EDITION.schoolClassTURID AND TURMA.TUR_MUN_ID = :countyId",
        { countyId },
      )
      .where("REPORT_EDITION.schoolClassTURID IS NOT NULL")
      .andWhere("REPORT_EDITION.editionAVAID = :assessmentId", { assessmentId })
      .andWhere("REPORT_SUBJECT.countTotalStudents > 0")
      .groupBy(
        "REPORT_SUBJECT.testTESID, TURMA.TUR_ESC_ID, REPORT_EDITION.editionAVAID",
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
}
