import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import { Parser } from "json2csv";
import { Assessment } from "src/assessment/model/entities/assessment.entity";
import { PaginationParams } from "src/helpers/params";
import { User } from "src/user/model/entities/user.entity";
import { Connection, Repository } from "typeorm";
import { Serie } from "../../serie/model/entities/serie.entity";
import { ReportEdition } from "../model/entities/report-edition.entity";
import { County } from "src/counties/model/entities/county.entity";
import { School } from "src/school/model/entities/school.entity";

@Injectable()
export class EvolutionaryLineService {
  constructor(
    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,

    @InjectRepository(ReportEdition)
    private reportEditionRepository: Repository<ReportEdition>,

    @InjectRepository(Serie)
    private seriesRepository: Repository<Serie>,

    @InjectConnection()
    private readonly conection: Connection,
  ) {}

  async evolutionaryLine(
    paginationParams: PaginationParams,
    user: User,
    reportByRelease?: boolean,
  ) {
    const { year, county, school, serie, schoolClass, edition } =
      paginationParams;



    const currentSerie = await this.seriesRepository.findOne(serie);
    let formattedCounty = county;
    let formattedSchool = school;

    if(user?.USU_SPE?.SPE_PER?.PER_NOME !== 'SAEV') {
      formattedCounty = user?.USU_MUN?.MUN_ID;
    }

    if (user?.USU_SPE?.SPE_PER?.PER_NOME === "Escola") {
      formattedSchool = user?.USU_ESC?.ESC_ID;
     }


    if (!currentSerie) {
      throw new BadRequestException("Parameter serie is invalid");
    }

    const typeLevelCountStudents = !!reportByRelease
      ? "countStudentsLaunched"
      : "countPresentStudents";

    const queryBuilder = this.reportEditionRepository
      .createQueryBuilder("report")
      .leftJoinAndSelect("report.edition", "edition")
      .leftJoinAndSelect("report.schoolClass", "schoolClass")
      .leftJoinAndSelect("report.school", "school")
      .leftJoinAndSelect("report.county", "county")
      .innerJoinAndSelect("report.reportsSubjects", "reportsSubjects")
      .innerJoinAndSelect("reportsSubjects.test", "test")
      .innerJoinAndSelect("test.TES_DIS", "TES_DIS")
      .innerJoin("test.TES_SER", "TES_SER", `TES_SER.SER_ID = :serie`, {
        serie,
      });

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
      queryBuilder.andWhere("school.ESC_ID = :school", { school: formattedSchool });
    } else if (formattedCounty) {
      if (user.USU_SPE.SPE_PER.PER_NOME === "Escola") {
        queryBuilder.andWhere("school.ESC_ID = :school", {
          school: user?.USU_ESC?.ESC_ID,
        });
      } else {
        queryBuilder.andWhere("county.MUN_ID = :county", { county: formattedCounty });
      }
    } else if (serie) {
      queryBuilder.andWhere(
        "county.MUN_ID IS NULL and school.ESC_ID IS NULL and schoolClass.TUR_ID IS NULL",
      );
    }

    const reports_editions = await queryBuilder.getMany();

    const items = reports_editions.map((reportEdition) => {
      const subjects = reportEdition.reportsSubjects.map((reportSubject) => {
        const test = reportSubject.test;

        if (test.TES_DIS.DIS_TIPO === "Objetiva") {
          const value = Math.round(
            reportSubject.totalGradesStudents /
              reportSubject[typeLevelCountStudents],
          );

          return {
            id: test.TES_DIS.DIS_ID,
            name: test.TES_DIS.DIS_NOME,
            color: test.TES_DIS?.DIS_COLOR,
            countLaunched: reportSubject[typeLevelCountStudents],
            percentageRightQuestions: !!value ? value : 0,
            totalStudents: reportSubject.countTotalStudents,
            percentageFinished:
              reportSubject.countTotalStudents > 0
                ? (reportSubject[typeLevelCountStudents] /
                    reportSubject.countTotalStudents) *
                  100
                : 0,
          };
        } else {
          let rightQuestions = 0;
          switch (currentSerie.SER_NUMBER) {
            case 1:
              rightQuestions =
                reportSubject.fluente +
                reportSubject.nao_fluente +
                reportSubject.frases;
              break;
            case 2:
            case 3:
              rightQuestions =
                reportSubject.fluente + reportSubject.nao_fluente;
              break;
            default:
              rightQuestions = reportSubject.fluente;
              break;
          }

          const totalRightQuestions = Math.round(
            (rightQuestions / reportSubject.countTotalStudents) * 100,
          );
          return {
            id: test.TES_DIS.DIS_ID,
            name: test.TES_DIS.DIS_NOME,
            color: test.TES_DIS?.DIS_COLOR,
            countLaunched: reportSubject[typeLevelCountStudents],
            percentageRightQuestions: !!totalRightQuestions
              ? totalRightQuestions
              : 0,
            totalStudents: reportSubject.countTotalStudents,
            percentageFinished:
              reportSubject.countTotalStudents > 0
                ? (reportSubject[typeLevelCountStudents] /
                    reportSubject.countTotalStudents) *
                  100
                : 0,
          };
        }
      });

      return {
        id: reportEdition.edition.AVA_ID,
        name: reportEdition.edition.AVA_NOME,
        subjects,
      };
    });

    return { items };
  }

  async evolutionaryLineByStudent(year: string, idStudent: string) {
    const queryBuilder = this.assessmentRepository
      .createQueryBuilder("AVALIACAO")
      .leftJoinAndSelect("AVALIACAO.AVA_TES", "AVA_TES")
      .leftJoinAndSelect("AVA_TES.STUDENTS_TEST", "STUDENTS_TEST")
      .leftJoinAndSelect("STUDENTS_TEST.ANSWERS_TEST", "ANSWERS_TEST")
      .leftJoin("STUDENTS_TEST.ALT_ALU", "ALT_ALU")
      .leftJoinAndSelect("AVA_TES.TES_DIS", "TES_DIS")
      .leftJoinAndSelect("AVA_TES.TEMPLATE_TEST", "TEMPLATE_TEST")
      .where("AVALIACAO.AVA_ANO = :year", { year })
      .andWhere("ALT_ALU.ALU_ID = :id", { id: idStudent });

    const data = await queryBuilder.getMany();

    const items = data.map((avaliacao) => {
      const subjects = avaliacao.AVA_TES.map((test) => {
        const student = test.STUDENTS_TEST[0] as any;

        if (test.TES_DIS.DIS_TIPO === "Objetiva") {
          const QUESTIONS_CERTA = test.STUDENTS_TEST[0].ANSWERS_TEST.reduce(
            (acc, cur) => {
              if (cur.ATR_CERTO) {
                return acc + 1;
              } else {
                return acc;
              }
            },
            0,
          );

          const totalRightQuestions = Math.round(
            (QUESTIONS_CERTA / test.TEMPLATE_TEST.length) * 100,
          );

          const isParticipated = !!student.ALT_FINALIZADO;

          return {
            id: test.TES_DIS.DIS_ID,
            name: test.TES_DIS.DIS_NOME,
            color: test.TES_DIS?.DIS_COLOR,
            isParticipated,
            totalRightQuestions: isParticipated ? totalRightQuestions : 0,
          };
        } else {
          const isParticipated =
            !!student.ANSWERS_TEST.length && !student.ALT_JUSTIFICATIVA;

          const percentageRightQuestions =
            isParticipated && student.ANSWERS_TEST[0].ATR_RESPOSTA === "fluente"
              ? 100
              : 0;

          const readType = student.ANSWERS_TEST[0].ATR_RESPOSTA;

          return {
            id: test.TES_DIS.DIS_ID,
            name: test.TES_DIS.DIS_NOME,
            color: test.TES_DIS?.DIS_COLOR,
            isParticipated,
            readType,
            totalRightQuestions: percentageRightQuestions,
          };
        }
      });

      const filterSubjects = subjects.filter(function (a) {
        return (
          !this[JSON.stringify(a?.name)] &&
          (this[JSON.stringify(a?.name)] = true)
        );
      }, Object.create(null));

      return {
        id: avaliacao.AVA_ID,
        name: avaliacao.AVA_NOME,
        subjects: filterSubjects,
      };
    });

    return {
      items,
    };
  }

  async evolutionaryLineOfReading(
    paginationParams: PaginationParams,
    user: User,
    reportByRelease?: boolean,
  ) {
    const { year, county, school, serie, schoolClass, edition } =
      paginationParams;
    
    let formattedCounty = county;

    if(user?.USU_SPE?.SPE_PER?.PER_NOME !== 'SAEV') {
      formattedCounty = user?.USU_MUN?.MUN_ID;
    }

    const currentSerie = await this.seriesRepository.findOne(serie);

    if (!currentSerie) {
      throw new BadRequestException("Parameter serie is invalid");
    }

    const queryBuilder = this.reportEditionRepository
      .createQueryBuilder("report")
      .leftJoinAndSelect("report.edition", "edition")
      .leftJoin("report.schoolClass", "schoolClass")
      .leftJoin("report.school", "school")
      .leftJoin("report.county", "county")
      .innerJoinAndSelect("report.reportsSubjects", "reportsSubjects")
      .innerJoin("reportsSubjects.test", "test")
      .innerJoin("test.TES_DIS", "TES_DIS")
      .innerJoin("test.TES_SER", "TES_SER", `TES_SER.SER_ID = :serie`, {
        serie,
      })
      .where(`TES_DIS.DIS_TIPO = 'Leitura'`);

    if (year) {
      queryBuilder.andWhere("edition.AVA_ANO = :year", { year });
    }
    if (edition) {
      queryBuilder.andWhere("edition.AVA_ID = :id", { id: edition });
    }

    if (schoolClass) {
      queryBuilder.andWhere("schoolClass.TUR_ID = :schoolClass", {
        schoolClass,
      });
    } else if (school) {
      queryBuilder.andWhere("school.ESC_ID = :school", { school });
    } else if (formattedCounty) {
      if (user.USU_SPE.SPE_PER.PER_NOME === "Escola") {
        queryBuilder.andWhere("school.ESC_ID = :school", {
          school: user?.USU_ESC?.ESC_ID,
        });
      } else {
        queryBuilder.andWhere("county.MUN_ID = :county", { county: formattedCounty });
      }
    } else if (serie) {
      queryBuilder.andWhere(
        "county.MUN_ID IS NULL and school.ESC_ID IS NULL and schoolClass.TUR_ID IS NULL",
      );
    }

    const reports_editions = await queryBuilder.getMany();

    const items = reports_editions.map((reportEdition) => {
      const subject = reportEdition?.reportsSubjects[0];

      return {
        id: reportEdition.edition.AVA_ID,
        name: reportEdition.edition.AVA_NOME,
        subject,
      };
    });

    return { items };
  }

  async generateCsvForLineOfReading(
    paginationParams: PaginationParams,
    user: User,
  ) {
    const { year, edition, county, school } = paginationParams;

    delete paginationParams?.schoolClass;


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

    const base_consulta = `${year} ${
      !!county ? ` > ${findCounty?.MUN_NOME}` : ""
    }${!!school ? ` > ${findSchool?.ESC_NOME}` : ""}`;

    const { items } = await this.evolutionaryLineOfReading(
      paginationParams,
      user,
    );

    const data = [];

    items?.forEach((item) => {
      const formattedDataSubject = {
        // serie: item?.serie?.SER_NOME ?? "",
        // disciplina: item.subject?.name ?? "",
        edicao: item.name,
        // base_consulta,
        total_alunos: item.subject?.countTotalStudents,
        total_participantes: item.subject?.countPresentStudents,
        fluente: item.subject?.fluente,
        nao_fluente: item.subject?.nao_fluente,
        frases: item.subject?.frases,
        palavras: item.subject?.palavras,
        silabas: item.subject?.silabas,
        nao_leitor: item.subject?.nao_leitor,
        nao_avaliado: item.subject?.nao_avaliado,
        nao_informado: item.subject?.nao_informado,
      };
      data.push(formattedDataSubject);
    });

    const parser = new Parser({
      quote: " ",
      withBOM: true,
      delimiter: ";",
    });

    try {
      const csv = parser.parse(data);
      return csv;
    } catch (error) {
      console.log("error csv:", error.message);
    }
  }
}
