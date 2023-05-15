import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Assessment } from "src/assessment/model/entities/assessment.entity";
import { PaginationParams } from "src/helpers/params";
import { User } from "src/user/model/entities/user.entity";
import { Repository } from "typeorm";
import { Serie } from "../../serie/model/entities/serie.entity";
import { ReportEdition } from "../model/entities/report-edition.entity";

@Injectable()
export class EvolutionaryLineService {
  constructor(
    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,

    @InjectRepository(ReportEdition)
    private reportEditionRepository: Repository<ReportEdition>,

    @InjectRepository(Serie)
    private seriesRepository: Repository<Serie>,
  ) {}

  async evolutionaryLine(paginationParams: PaginationParams,user: User, reportByRelease?: boolean, ) {
    const { year, county, school, serie, schoolClass, edition } =
      paginationParams;

    const currentSerie = await this.seriesRepository.findOne(serie);

    if (!currentSerie) {
      throw new BadRequestException("Parameter serie is invalid");
    }

    const typeLevelCountStudents = !!reportByRelease ? 'countStudentsLaunched' : 'countPresentStudents'

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
    } else if (school) {
      queryBuilder.andWhere("school.ESC_ID = :school", { school });
    } else if (county) {
      if (user.USU_SPE.SPE_PER.PER_NOME === "Escola") {
        queryBuilder.andWhere("school.ESC_ID = :school", {
          school: user?.USU_ESC?.ESC_ID,
        });
      } else {
        queryBuilder.andWhere("county.MUN_ID = :county", { county });
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
          const value = Math.floor(
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
                ? 
                    (reportSubject[typeLevelCountStudents] /
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

          const totalRightQuestions = Math.floor(
            (rightQuestions / reportSubject.countStudentsLaunched) * 100,
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
                ? 
                    (reportSubject[typeLevelCountStudents] /
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

          const totalRightQuestions = Math.floor(
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
}
