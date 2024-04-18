import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/typeorm";
import { ReportEdition } from "src/reports/model/entities/report-edition.entity";
import { Connection } from "typeorm";

@Injectable()
export class JobRaceRepository {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async getReportRaceGrouppedByEdition(assessmentId: number, testId: number) {
    const data = await this.connection
      .getRepository(ReportEdition)
      .createQueryBuilder("REPORT_EDITION")
      .select([
        "REPORT_RACE.reportSubjectId",
        "REPORT_EDITION.schoolESCID",
        "REPORT_SUBJECT.testTESID as testTESID",
        "REPORT_SUBJECT.type as type",
        "REPORT_RACE.racePELID as PEL_ID",
        "REPORT_RACE.name as name",
        "SUM(REPORT_RACE.countTotalStudents) as countTotalStudents",
        "SUM(REPORT_RACE.countPresentStudents) as countPresentStudents",
        "SUM(REPORT_RACE.totalGradesStudents) as totalGradesStudents",
        "SUM(REPORT_RACE.fluente) as fluente",
        "SUM(REPORT_RACE.nao_fluente) as nao_fluente",
        "SUM(REPORT_RACE.frases) as frases",
        "SUM(REPORT_RACE.palavras) as palavras",
        "SUM(REPORT_RACE.silabas) as silabas",
        "SUM(REPORT_RACE.nao_leitor) as nao_leitor",
        "SUM(REPORT_RACE.nao_avaliado) as nao_avaliado",
        "SUM(REPORT_RACE.nao_informado) as nao_informado",
      ])
      .innerJoin(
        "report_subject",
        "REPORT_SUBJECT",
        "REPORT_EDITION.id = REPORT_SUBJECT.reportEditionId",
      )
      .innerJoin(
        "report_race",
        "REPORT_RACE",
        "REPORT_SUBJECT.id = REPORT_RACE.reportSubjectId",
      )
      .where("REPORT_EDITION.countyMUNID IS NOT NULL")
      .andWhere("REPORT_EDITION.editionAVAID = :assessmentId", { assessmentId })
      .andWhere("REPORT_SUBJECT.testTESID = :testId", { testId })
      .groupBy("REPORT_RACE.name")
      .getRawMany();

    return data;
  }

  async getReportRaceGrouppedByCounty(countyId: number, testId: number) {
    const data = await this.connection
      .getRepository(ReportEdition)
      .createQueryBuilder("REPORT_EDITION")
      .select([
        "REPORT_RACE.reportSubjectId",
        "ESCOLA.ESC_MUN_ID as MUN_ID",
        "REPORT_EDITION.schoolESCID",
        "REPORT_SUBJECT.testTESID as testTESID",
        "REPORT_SUBJECT.type as type",
        "REPORT_RACE.racePELID as PEL_ID",
        "REPORT_RACE.name as name",
        "SUM(REPORT_RACE.countTotalStudents) as countTotalStudents",
        "SUM(REPORT_RACE.countPresentStudents) as countPresentStudents",
        "SUM(REPORT_RACE.totalGradesStudents) as totalGradesStudents",
        "SUM(REPORT_RACE.fluente) as fluente",
        "SUM(REPORT_RACE.nao_fluente) as nao_fluente",
        "SUM(REPORT_RACE.frases) as frases",
        "SUM(REPORT_RACE.palavras) as palavras",
        "SUM(REPORT_RACE.silabas) as silabas",
        "SUM(REPORT_RACE.nao_leitor) as nao_leitor",
        "SUM(REPORT_RACE.nao_avaliado) as nao_avaliado",
        "SUM(REPORT_RACE.nao_informado) as nao_informado",
      ])
      .innerJoin(
        "report_subject",
        "REPORT_SUBJECT",
        "REPORT_EDITION.id = REPORT_SUBJECT.reportEditionId",
      )
      .innerJoin(
        "report_race",
        "REPORT_RACE",
        "REPORT_SUBJECT.id = REPORT_RACE.reportSubjectId",
      )
      .innerJoin(
        "escola",
        "ESCOLA",
        "ESCOLA.ESC_ID = REPORT_EDITION.schoolESCID",
      )
      .where("REPORT_EDITION.schoolESCID IS NOT NULL")
      .andWhere("REPORT_SUBJECT.testTESID = :testId", { testId })
      .andWhere("ESCOLA.ESC_MUN_ID = :countyId", { countyId })
      .groupBy("REPORT_RACE.name, ESCOLA.ESC_MUN_ID")
      .getRawMany();

    return data;
  }

  async getReportRaceGrouppedByTestAndSchoolClass(
    schoolId: number,
    testId: number,
  ) {
    const data = await this.connection
      .getRepository(ReportEdition)
      .createQueryBuilder("REPORT_EDITION")
      .select([
        "TURMA.TUR_ESC_ID as ESC_ID",
        "REPORT_EDITION.schoolClassTURID",
        "TURMA.TUR_SER_ID as SER_ID",
        "REPORT_RACE.racePELID as PEL_ID",
        "REPORT_RACE.name as name",
        "SUM(REPORT_RACE.countTotalStudents) as countTotalStudents",
        "SUM(REPORT_RACE.countPresentStudents) as countPresentStudents",
        "SUM(REPORT_RACE.totalGradesStudents) as totalGradesStudents",
        "SUM(REPORT_RACE.fluente) as fluente",
        "SUM(REPORT_RACE.nao_fluente) as nao_fluente",
        "SUM(REPORT_RACE.frases) as frases",
        "SUM(REPORT_RACE.palavras) as palavras",
        "SUM(REPORT_RACE.silabas) as silabas",
        "SUM(REPORT_RACE.nao_leitor) as nao_leitor",
        "SUM(REPORT_RACE.nao_avaliado) as nao_avaliado",
        "SUM(REPORT_RACE.nao_informado) as nao_informado",
      ])
      .innerJoin(
        "report_subject",
        "REPORT_SUBJECT",
        "REPORT_EDITION.id = REPORT_SUBJECT.reportEditionId",
      )
      .innerJoin(
        "report_race",
        "REPORT_RACE",
        "REPORT_SUBJECT.id = REPORT_RACE.reportSubjectId",
      )
      .innerJoin(
        "turma",
        "TURMA",
        "TURMA.TUR_ID = REPORT_EDITION.schoolClassTURID AND TURMA.TUR_ESC_ID = :schoolId",
        { schoolId },
      )
      .where("REPORT_EDITION.schoolClassTURID IS NOT NULL")
      .andWhere("REPORT_SUBJECT.testTESID = :testId", { testId })
      .groupBy("REPORT_RACE.name")
      .getRawMany();

    return data;
  }
}
