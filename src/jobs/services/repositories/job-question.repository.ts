import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/typeorm";
import { ReportQuestion } from "src/reports/model/entities/report-question.entity";
import { Connection } from "typeorm";

@Injectable()
export class JobQuestionRepository {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async getReportQuestionGrouppedByEdition(
    assessmentId: number,
    questionId: number,
  ) {
    const data = await this.connection
      .getRepository(ReportQuestion)
      .createQueryBuilder("ReportQuestion")
      .select([
        "reportOptions.option as optionQuestion",
        "SUM(reportOptions.totalCorrect) as totalCorrect",
        "SUM(reportOptions.fluente) as fluente",
        "SUM(reportOptions.nao_fluente) as nao_fluente",
        "SUM(reportOptions.frases) as frases",
        "SUM(reportOptions.palavras) as palavras",
        "SUM(reportOptions.silabas) as silabas",
        "SUM(reportOptions.nao_leitor) as nao_leitor",
        "SUM(reportOptions.nao_avaliado) as nao_avaliado",
        "SUM(reportOptions.nao_informado) as nao_informado",
      ])
      .innerJoin("ReportQuestion.reportSubject", "reportSubject")
      .innerJoin("reportSubject.reportEdition", "reportEdition")
      .innerJoin("ReportQuestion.reportOptions", "reportOptions")
      .where("reportEdition.countyMUNID IS NOT NULL")
      .andWhere("reportEdition.editionAVAID = :assessmentId", { assessmentId })
      .andWhere("ReportQuestion.questionTEGID = :questionId", { questionId })
      .groupBy("reportOptions.option")
      .getRawMany();

    return data;
  }

  async getReportQuestionGrouppedByCounty(
    countyId: number,
    questionId: number,
  ) {
    const data = await this.connection
      .getRepository(ReportQuestion)
      .createQueryBuilder("ReportQuestion")
      .select([
        "reportOptions.option as optionQuestion",
        "SUM(reportOptions.totalCorrect) as totalCorrect",
        "SUM(reportOptions.fluente) as fluente",
        "SUM(reportOptions.nao_fluente) as nao_fluente",
        "SUM(reportOptions.frases) as frases",
        "SUM(reportOptions.palavras) as palavras",
        "SUM(reportOptions.silabas) as silabas",
        "SUM(reportOptions.nao_leitor) as nao_leitor",
        "SUM(reportOptions.nao_avaliado) as nao_avaliado",
        "SUM(reportOptions.nao_informado) as nao_informado",
      ])
      .innerJoin("ReportQuestion.reportSubject", "reportSubject")
      .innerJoin("reportSubject.reportEdition", "reportEdition")
      .innerJoin("ReportQuestion.reportOptions", "reportOptions")
      .innerJoin(
        "escola",
        "ESCOLA",
        "ESCOLA.ESC_ID = reportEdition.schoolESCID",
      )
      .where("reportEdition.schoolESCID IS NOT NULL")
      .andWhere("ESCOLA.ESC_MUN_ID = :countyId", { countyId })
      .andWhere("ReportQuestion.questionTEGID = :questionId", { questionId })
      .groupBy("reportOptions.option")
      .getRawMany();

    return data;
  }

  async getReportQuestionGrouppedByTestAndSchoolClass(
    schoolId: number,
    questionId: number,
  ) {
    const data = await this.connection
      .getRepository(ReportQuestion)
      .createQueryBuilder("ReportQuestion")
      .select([
        "reportOptions.option as optionQuestion",
        "SUM(reportOptions.totalCorrect) as totalCorrect",
        "SUM(reportOptions.fluente) as fluente",
        "SUM(reportOptions.nao_fluente) as nao_fluente",
        "SUM(reportOptions.frases) as frases",
        "SUM(reportOptions.palavras) as palavras",
        "SUM(reportOptions.silabas) as silabas",
        "SUM(reportOptions.nao_leitor) as nao_leitor",
        "SUM(reportOptions.nao_avaliado) as nao_avaliado",
        "SUM(reportOptions.nao_informado) as nao_informado",
      ])
      .innerJoin("ReportQuestion.reportSubject", "reportSubject")
      .innerJoin("reportSubject.reportEdition", "reportEdition")
      .innerJoin("ReportQuestion.reportOptions", "reportOptions")
      .innerJoin(
        "turma",
        "TURMA",
        "TURMA.TUR_ID = reportEdition.schoolClassTURID AND TURMA.TUR_ESC_ID = :schoolId",
        { schoolId },
      )
      .where("reportEdition.schoolClassTURID IS NOT NULL")
      .andWhere("ReportQuestion.questionTEGID = :questionId", { questionId })
      .groupBy("reportOptions.option")
      .getRawMany();

    return data;
  }
}
