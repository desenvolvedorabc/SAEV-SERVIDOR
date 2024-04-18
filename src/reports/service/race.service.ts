import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import { PaginationParams } from "src/helpers/params";
import { Serie } from "src/serie/model/entities/serie.entity";
import { User } from "src/user/model/entities/user.entity";
import { Connection, Repository } from "typeorm";
import { ReportEdition } from "../model/entities/report-edition.entity";
import { Subject } from "src/subject/model/entities/subject.entity";
import { County } from "src/counties/model/entities/county.entity";
import { School } from "src/school/model/entities/school.entity";
import { SchoolClass } from "src/school-class/model/entities/school-class.entity";
import { Parser } from "json2csv";

@Injectable()
export class ReportRaceService {
  constructor(
    @InjectRepository(ReportEdition)
    private reportEditionRepository: Repository<ReportEdition>,

    @InjectConnection()
    private readonly conection: Connection,
  ) {}

  async handle(paginationParams: PaginationParams, user: User) {
    const { county, edition, school, schoolClass, year, serie } =
      paginationParams;

    let formattedCounty = county;
    let formattedSchool = school;

    const currentSerie = await this.conection
      .getRepository(Serie)
      .findOne(serie);

    if (user?.USU_SPE?.SPE_PER?.PER_NOME !== "SAEV") {
      formattedCounty = user?.USU_MUN?.MUN_ID;
    }

    if (user?.USU_SPE?.SPE_PER?.PER_NOME === "Escola") {
      formattedSchool = user?.USU_ESC?.ESC_ID;
    }

    const subjects = await this.conection.getRepository(Subject).find({
      where: {
        DIS_ATIVO: true,
      },
    });

    const queryBuilder = this.reportEditionRepository
      .createQueryBuilder("report")
      .leftJoinAndSelect("report.edition", "edition")
      .leftJoinAndSelect("report.schoolClass", "schoolClass")
      .leftJoinAndSelect("report.school", "school")
      .leftJoinAndSelect("report.county", "county")
      .innerJoinAndSelect("report.reportsSubjects", "reportsSubjects")
      .innerJoinAndSelect("reportsSubjects.test", "test")
      .innerJoinAndSelect("reportsSubjects.reportRaces", "reportRaces")
      .innerJoinAndSelect("test.TES_DIS", "TES_DIS")
      .innerJoin("test.TES_SER", "TES_SER", `TES_SER.SER_ID = :serie`, {
        serie,
      })
      .orderBy('edition.AVA_DT_CRIACAO', 'DESC');

    if (year) {
      queryBuilder.andWhere("edition.AVA_ANO = :year", { year });
    }
    if (edition) {
      queryBuilder.where("edition.AVA_ID = :id", { id: edition });
    }

    if (schoolClass) {
      queryBuilder.andWhere("schoolClass.TUR_ID = :schoolClass", {
        schoolClass,
      });
    } else if (formattedSchool) {
      queryBuilder.andWhere("school.ESC_ID = :school", {
        school: formattedSchool,
      });
    } else if (formattedCounty) {
      if (user.USU_SPE.SPE_PER.PER_NOME === "Escola") {
        queryBuilder.andWhere("school.ESC_ID = :school", {
          school: user?.USU_ESC?.ESC_ID,
        });
      } else {
        queryBuilder.andWhere("county.MUN_ID = :county", {
          county: formattedCounty,
        });
      }
    } else if (serie) {
      queryBuilder.andWhere(
        "county.MUN_ID IS NULL and school.ESC_ID IS NULL and schoolClass.TUR_ID IS NULL",
      );
    }

    const reports = await queryBuilder.getMany();

    let items = [];

    if (reports?.length) {
      items = subjects.map((subject) => {
        const values = reports
          .map((report) => {
            const findTest = report.reportsSubjects.find(
              (testReport) => testReport.test.TES_DIS.DIS_ID === subject.DIS_ID,
            );

            if (!findTest) {
              return null;
            }

            let totalStudents = 0;
            let rightQuestionsForLeitura = 0;
            let RacesArray = [];

            findTest.reportRaces.map((rac) => {
              let total_percent = 0;

              if (subject.DIS_TIPO === "Objetiva") {
                totalStudents += rac.countPresentStudents;
                total_percent =
                  Math.round(
                    rac.totalGradesStudents / rac.countPresentStudents,
                  ) || 0;
              } else {
                let rightQuestions = 0;
                switch (currentSerie.SER_NUMBER) {
                  case 1:
                    rightQuestions = rac.fluente + rac.nao_fluente + rac.frases;
                    break;
                  case 2:
                  case 3:
                    rightQuestions = rac.fluente + rac.nao_fluente;
                    break;
                  default:
                    rightQuestions = rac.fluente;
                    break;
                }

                rightQuestionsForLeitura += rightQuestions;
                totalStudents += rac.countTotalStudents;

                total_percent = Math.round(
                  (rightQuestions / rac.countTotalStudents) * 100,
                );
              }

              RacesArray.push({
                id: rac.id,
                name: rac.name,
                total: rac.countTotalStudents,
                total_percent: !!total_percent ? total_percent : 0,
                countTotalStudents: rac.countTotalStudents,
                totalGradesStudents: rac.totalGradesStudents,
                countPresentStudents: rac.countPresentStudents,
                fluente: rac.fluente,
                nao_fluente: rac.nao_fluente,
                frases: rac.frases,
                palavras: rac.palavras,
                silabas: rac.silabas,
                nao_leitor: rac.nao_leitor,
                nao_avaliado: rac.nao_avaliado,
                nao_informado: rac.nao_informado,
              });
            });

            let total_percent = 0;
            if (subject.DIS_TIPO === "Objetiva") {
              total_percent = Math.round(findTest.totalGradesStudents / findTest.countPresentStudents);
            } else {
              total_percent = Math.round(
                (rightQuestionsForLeitura / totalStudents) * 100,
              );
            }

            RacesArray = RacesArray.sort((a, b) => a.name.localeCompare(b.name))

            return {
              id: report.edition.AVA_ID,
              name: report.edition.AVA_NOME,
              total_percent: !!total_percent ? total_percent : 0,
              races: RacesArray,
            };
          })
          .filter((item) => item);

        return {
          id: subject.DIS_ID,
          subject: subject.DIS_NOME,
          typeSubject: subject.DIS_TIPO,
          items: values,
        };
      });
    }

    return {
      items,
    };
  }

  async generateCsv(paginationParams: PaginationParams, user: User) {
    const { year, county, school, serie, schoolClass } = paginationParams;

    const findSerie = await this.conection.getRepository(Serie).findOne({
      where: {
        SER_ID: serie,
      },
    });

    const findCounty = await this.conection.getRepository(County).findOne({
      where: {
        MUN_ID: county,
      },
    });

    const findSchool = await this.conection.getRepository(School).findOne({
      where: {
        ESC_ID: school,
      },
    });

    const findSchoolClass = await this.conection
      .getRepository(SchoolClass)
      .findOne({
        where: {
          TUR_ID: schoolClass,
        },
      });

    const { items } = await this.handle(
      {
        ...paginationParams,
        serie,
      },
      user,
    );

    const data = [];

    const base_consulta = `${year} > ${findSerie?.SER_NOME}${
      !!county ? ` > ${findCounty?.MUN_NOME}` : ""
    }${!!school ? ` > ${findSchool?.ESC_NOME}` : ""}${
      !!schoolClass ? ` > ${findSchoolClass?.TUR_NOME}` : ""
    }`;

    items.forEach((subject) => {
      subject.items.forEach((subjectItem) => {
        subjectItem.races.forEach((race) => {
          const formattedDataSubject =
            subject.typeSubject === "Objetiva"
              ? {
                  disciplina: subject?.subject ?? "",
                  base_consulta,
                  edicao: subjectItem?.name ?? "",
                  total_geral: `${subjectItem?.total_percent}%`,
                  nome_raca: race.name,
                  total_raca: `${race.total_percent}%`,
                  total_alunos: race.countTotalStudents,
                  total_participantes: race.countPresentStudents,
                  objetiva_total_acertos: race.totalGradesStudents,
                  fluente: "-",
                  nao_fluente: "-",
                  frases: "-",
                  palavras: "-",
                  silabas: "-",
                  nao_leitor: "-",
                  nao_avaliado: "-",
                  nao_informado: "-",
                }
              : {
                  disciplina: subject?.subject ?? "",
                  base_consulta,
                  edicao: subjectItem?.name ?? "",
                  total_geral: `${subjectItem?.total_percent}%`,
                  nome_raca: race.name,
                  total_raca: `${race.total_percent}%`,
                  total_alunos: race.countTotalStudents,
                  total_participantes: race.countPresentStudents,
                  objetiva_total_acertos: 0,
                  fluente: race.fluente,
                  nao_fluente: race.nao_fluente,
                  frases: race.frases,
                  palavras: race.palavras,
                  silabas: race.silabas,
                  nao_leitor: race.nao_leitor,
                  nao_avaliado: race.nao_avaliado,
                  nao_informado: race.nao_informado,
                };
          data.push(formattedDataSubject);
        });
      });
    });

    const parser = new Parser({
      quote: " ",
      withBOM: true,
    });

    if (!items.length) {
      data.push({
        disciplina: "-",
        base_consulta: "-",
        edicao: "-",
        total_geral: "-",
        nome_raca: "-",
        total_alunos: "-",
        total_participantes: "-",
        objetiva_total_acertos: "-",
        fluente: "-",
        nao_fluente: "-",
        frases: "-",
        palavras: "-",
        silabas: "-",
        nao_leitor: "-",
        nao_avaliado: "-",
        nao_informado: "-",
      });
    }

    try {
      const csv = parser.parse(data);
      return csv;
    } catch (error) {
      console.log("error csv:", error.message);
    }
  }
}
