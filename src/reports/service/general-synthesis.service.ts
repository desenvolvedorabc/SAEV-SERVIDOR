import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import { Parser } from "json2csv";
import { Assessment } from "src/assessment/model/entities/assessment.entity";
import { County } from "src/counties/model/entities/county.entity";
import { PaginationParams } from "src/helpers/params";
import { StudentTest } from "src/release-results/model/entities/student-test.entity";
import { School } from "src/school/model/entities/school.entity";
import { Serie } from "src/serie/model/entities/serie.entity";
import { Student } from "src/student/model/entities/student.entity";
import { User } from "src/user/model/entities/user.entity";
import { Connection, Repository } from "typeorm";
import { SubjectTypeEnum } from "../../subject/model/enum/subject-type.enum";
import { ReportEdition } from "../model/entities/report-edition.entity";

const leitorBySerie = {
  1: ["frases", "nao_fluente", "fluente"],
  2: ["nao_fluente", "fluente"],
  3: ["nao_fluente", "fluente"],
  4: ["fluente"],
  5: ["fluente"],
  6: ["fluente"],
  7: ["fluente"],
  8: ["fluente"],
  9: ["fluente"],
} as const;

@Injectable()
export class GeneralSynthesisService {
  constructor(
    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,

    @InjectRepository(ReportEdition)
    private reportEditionRepository: Repository<ReportEdition>,

    @InjectConnection()
    private readonly conection: Connection,
  ) {}

  async handle(paginationParams: PaginationParams, user: User) {
    const { county, edition, school, schoolClass, column, order, year, serie } =
      paginationParams;

      let formattedCounty = county;
      let formattedSchool = school;

      if(user?.USU_SPE?.SPE_PER?.PER_NOME !== 'SAEV') {
        formattedCounty = user?.USU_MUN?.MUN_ID;
      }

      if (user?.USU_SPE?.SPE_PER?.PER_NOME === "Escola") {
        formattedSchool = user?.USU_ESC?.ESC_ID;
       }

    if (schoolClass) {
      const detailsSerie = await this.conection.getRepository(Serie).findOne({
        where: {
          SER_ID: serie,
        },
      });

      const reportEdition = await this.conection
        .getRepository(ReportEdition)
        .createQueryBuilder("ReportEdition")
        .innerJoinAndSelect("ReportEdition.reportsSubjects", "reportsSubjects")
        .innerJoin("reportsSubjects.test", "test")
        .innerJoin("test.TES_SER", "TES_SER", `TES_SER.SER_ID = :serie`, {
          serie,
        })
        .where("ReportEdition.schoolClass = :schoolClass", { schoolClass })
        .andWhere("ReportEdition.edition = :edition", { edition })
        .getOne();

      const idsStudents = reportEdition?.reportsSubjects[0]?.idStudents;

      const queryBuilder = this.assessmentRepository
        .createQueryBuilder("AVALIACAO")
        .leftJoin("AVALIACAO.AVA_AVM", "AVA_AVM")
        .leftJoin("AVA_AVM.AVM_MUN", "AVM_MUN")
        .leftJoin("AVM_MUN.schools", "schools")
        .leftJoinAndSelect("AVALIACAO.AVA_TES", "AVA_TES")
        .innerJoin(
          "AVA_TES.TES_SER",
          "TES_SER",
          `TES_SER.SER_ID IN (:series)`,
          {
            series: serie?.split(","),
          },
        )
        .leftJoinAndSelect("AVA_TES.TEMPLATE_TEST", "TEMPLATE_TEST")
        .leftJoinAndSelect("TEMPLATE_TEST.TEG_MTI", "TEG_MTI")
        .leftJoinAndSelect("AVA_TES.TES_DIS", "TES_DIS");

      if (edition) {
        queryBuilder.andWhere("AVALIACAO.AVA_ID = :AVA_ID", {
          AVA_ID: edition,
        });
      }
      if (formattedSchool) {
        queryBuilder.andWhere("schools.ESC_ID = :school", { school: formattedSchool });
      } else if (formattedCounty) {
        queryBuilder.andWhere("AVM_MUN.MUN_ID = :county", { county: formattedCounty });
      }

      const ava = await queryBuilder.getOne();

      let items = [];

      if (!!ava?.AVA_TES?.length && idsStudents?.length) {
        items = await Promise.all(
          ava?.AVA_TES?.map(async (test) => {
            if (test.TES_DIS.DIS_TIPO === "Objetiva") {
              let STUDENTS_TEST = await Promise.all(
                idsStudents?.map(async (ALU_ID, index) => {
                  const student = await this.conection
                    .getRepository(Student)
                    .createQueryBuilder("Student")
                    .select(["Student.ALU_ID", "Student.ALU_NOME"])
                    .where("Student.ALU_ID = :idStudent", { idStudent: ALU_ID })
                    .getOne();

                  const studentTest = await this.conection
                    .getRepository(StudentTest)
                    .createQueryBuilder("ALUNO_TESTE")
                    .leftJoinAndSelect(
                      "ALUNO_TESTE.ANSWERS_TEST",
                      "ANSWERS_TEST",
                    )
                    .leftJoinAndSelect(
                      "ANSWERS_TEST.questionTemplate",
                      "questionTemplate",
                    )
                    .where(
                      `ALUNO_TESTE.ALT_ALU_ID = '${ALU_ID}' AND ALUNO_TESTE.ALT_TES_ID = '${test?.TES_ID}'`,
                    )
                    .andWhere("ALUNO_TESTE.schoolClass = :schoolClass", {
                      schoolClass,
                    })
                    .getOne();

                  const ANSWERS_TEST = studentTest?.ANSWERS_TEST?.filter((arr, index, self) =>
                  index === self.findIndex((t) => (t?.questionTemplate?.TEG_ID === arr?.questionTemplate?.TEG_ID)))
              

                  const STUDENTS_RIGHT = ANSWERS_TEST?.reduce(
                    (sum, cur) => {
                      if (!!cur?.ATR_CERTO) {
                        return sum + 1;
                      } else {
                        return sum;
                      }
                    },
                    0,
                  );

                  const quests = ANSWERS_TEST?.map((data) => {
                    return {
                      id: data.ATR_ID,
                      letter: data.ATR_RESPOSTA,
                      type: !!data?.ATR_CERTO ? "right" : "wrong",
                      questionId: data?.questionTemplate?.TEG_ID,
                    };
                  });

                  return {
                    id: student.ALU_ID,
                    name: student.ALU_NOME,
                    quests,
                    studentTest,
                    avg:
                      +Math.round(
                        (STUDENTS_RIGHT / test?.TEMPLATE_TEST?.length) * 100,
                      ) ?? 0,
                  };
                }),
              );

              const descriptors = test.TEMPLATE_TEST.map((data) => {
                return {
                  id: data?.TEG_ID,
                  TEG_ORDEM: data?.TEG_ORDEM,
                  cod: data?.TEG_MTI?.MTI_CODIGO,
                  description: !!data?.TEG_MTI?.MTI_ID
                    ? `${data?.TEG_MTI?.MTI_CODIGO} - ${data?.TEG_MTI?.MTI_DESCRITOR}`
                    : "",
                };
              });

              return {
                id: test.TES_ID,
                subject: test.TES_DIS.DIS_NOME,
                type: "table",

                quests: {
                  total: descriptors.length,
                  descriptors,
                },
                students: STUDENTS_TEST,
              };
            } else {
              let students = await Promise.all(
                idsStudents?.map(async (ALU_ID) => {
                  const student = await this.conection
                    .getRepository(Student)
                    .createQueryBuilder("Student")
                    .select(["Student.ALU_ID", "Student.ALU_NOME"])
                    .where("Student.ALU_ID = :idStudent", { idStudent: ALU_ID })
                    .getOne();

                  const studentTest = await this.conection
                    .getRepository(StudentTest)
                    .createQueryBuilder("ALUNO_TESTE")
                    .leftJoinAndSelect(
                      "ALUNO_TESTE.ANSWERS_TEST",
                      "ANSWERS_TEST",
                    )
                    .where(
                      `ALUNO_TESTE.ALT_ALU_ID = '${ALU_ID}' AND ALUNO_TESTE.ALT_TES_ID = '${test?.TES_ID}'`,
                    )
                    .andWhere("ALUNO_TESTE.schoolClass = :schoolClass", {
                      schoolClass,
                    })
                    .getOne();

                  let type: string = "nao_informado";

                  if (studentTest) {
                    type =
                      !studentTest?.ALT_FINALIZADO ||
                      !studentTest?.ANSWERS_TEST?.length
                        ? "nao_avaliado"
                        : studentTest.ANSWERS_TEST[0].ATR_RESPOSTA;
                  }

                  return {
                    id: student.ALU_ID,
                    name: student.ALU_NOME,
                    type,
                  };
                }),
              );

              const resultDataReading = students.reduce(
                (acc, cur) => {
                  return {
                    ...acc,
                    [cur.type]: acc[cur.type] + 1,
                  };
                },
                {
                  fluente: 0,
                  nao_fluente: 0,
                  frases: 0,
                  palavras: 0,
                  silabas: 0,
                  nao_leitor: 0,
                  nao_avaliado: 0,
                  nao_informado: 0,
                },
              );

              return {
                id: test.TES_ID,
                subject: test.TES_DIS.DIS_NOME,
                optionsReading: leitorBySerie[detailsSerie?.SER_NUMBER],
                numberSerie: detailsSerie?.SER_NUMBER,
                type: "table",
                students,
                dataGraph: {
                  ...resultDataReading,
                },
              };
            }
          }),
        );
      }

      return {
        items,
      };
    }

    const data = await this.assessmentRepository
      .createQueryBuilder("AVALIACAO")
      .innerJoinAndSelect("AVALIACAO.AVA_TES", "AVA_TES")
      .leftJoinAndSelect("AVA_TES.TES_DIS", "TES_DIS")
      // .leftJoinAndSelect(qb => qb.select().a, "AVA_TES.TES_DIS", "TES_DIS")
      .andWhere("AVA_TES.TES_SER_ID = :serie", { serie })
      .andWhere("AVALIACAO.AVA_ID = :AVA_ID", {
        AVA_ID: edition,
      })
      .getOne();

    let exams = data?.AVA_TES ?? [];

    exams = exams.sort((a, b) =>
      a.TES_DIS.DIS_NOME.localeCompare(b.TES_DIS.DIS_NOME),
    );

    const queryReports = this.reportEditionRepository
      .createQueryBuilder("report")
      .leftJoinAndSelect("report.edition", "edition")
      .leftJoinAndSelect("report.schoolClass", "schoolClass")
      .leftJoinAndSelect("report.school", "school")
      .leftJoinAndSelect("report.county", "county")
      .leftJoin("school.ESC_MUN", "ESC_MUN")
      .innerJoinAndSelect("report.reportsSubjects", "reportsSubjects")
      .innerJoinAndSelect("reportsSubjects.test", "test")
      .innerJoin("test.TES_SER", "TES_SER", `TES_SER.SER_ID = :serie`, {
        serie,
      })
      .leftJoin("schoolClass.TUR_ESC", "TUR_ESC")
      .leftJoin("schoolClass.TUR_SER", "TUR_SER")
      .where("edition.AVA_ID = :id", { id: edition })
      .andWhere("reportsSubjects.countTotalStudents > 0");

    if (formattedSchool) {
      queryReports.andWhere("TUR_ESC.ESC_ID = :school", { school: formattedSchool });
    } else if (formattedCounty) {
      queryReports.andWhere("ESC_MUN.MUN_ID = :county", { county: formattedCounty });
      if (user.USU_SPE.SPE_PER.PER_NOME === "Escola") {
        queryReports.andWhere("school.ESC_ID = :school", {
          school: user?.USU_ESC?.ESC_ID,
        });
      }
    } else if (edition) {
      queryReports.andWhere("county.MUN_ID IS NOT NULL");
      if (user.USU_SPE.SPE_PER.PER_NOME !== "SAEV") {
        queryReports.andWhere("county.MUN_ID = :county", {
          county: user?.USU_MUN?.MUN_ID,
        });
      }
    }

    const reportsSchoolClass = await queryReports.getMany();

    let level = "";
    let items = [];

    if (!schoolClass && reportsSchoolClass?.length) {
      items = exams.map((test) => {
        let totalGradesStudents = 0;
        let countPresentStudents = 0;
        const values = reportsSchoolClass
          .map((report) => {
            let id;
            let name = "";

            if (formattedSchool) {
              id = report.schoolClass?.TUR_ID;
              name = report.schoolClass?.TUR_NOME;
              level = "schoolClass";
            } else if (formattedCounty) {
              id = report.school?.ESC_ID;
              name = report.school?.ESC_NOME;
              level = "school";
            } else if (edition) {
              id = report.county?.MUN_ID;
              name = report.county?.MUN_NOME;
              level = "county";
            }

            const findTest = report.reportsSubjects.find(
              (testReport) => testReport.test.TES_ID === test.TES_ID,
            );

            if (!findTest) {
              return null;
            }

            totalGradesStudents += findTest.totalGradesStudents;
            countPresentStudents += findTest.countPresentStudents;
            const value = Math.round(
              findTest.totalGradesStudents / findTest.countPresentStudents,
            );

            return {
              ...findTest,
              id,
              name,
              value: !!value ? value : 0,
            };
          })
          .filter((item) => item);

        const calcNumbers = this.calculateMinMedMax([
          ...values.map((data) => data.value),
        ]);

        const resultDataReading = values.reduce(
          (acc, cur) => {
            return {
              fluente: acc.fluente + cur.fluente,
              nao_fluente: acc.nao_fluente + cur.nao_fluente,
              frases: acc.frases + cur.frases,
              palavras: acc.palavras + cur.palavras,
              silabas: acc.silabas + cur.silabas,
              nao_leitor: acc.nao_leitor + cur.nao_leitor,
              nao_avaliado: acc.nao_avaliado + cur.nao_avaliado,
              nao_informado: acc.nao_informado + cur.nao_informado,
            };
          },
          {
            fluente: 0,
            nao_fluente: 0,
            frases: 0,
            palavras: 0,
            silabas: 0,
            nao_leitor: 0,
            nao_avaliado: 0,
            nao_informado: 0,
          },
        );

        return {
          id: test.TES_ID,
          subject: test.TES_DIS.DIS_NOME,
          typeSubject: test.TES_DIS.DIS_TIPO,
          level,
          type: "bar",
          items: values,
          ...calcNumbers,
          avg: Math.round(totalGradesStudents / countPresentStudents),
          dataGraph: {
            ...resultDataReading,
          },
        };
      });
    }

    return {
      items: items.filter((exam) => {
        if (
          exam.items.some((schoolClassResult) => schoolClassResult.value > 0) ||
          exam.typeSubject == SubjectTypeEnum.LEITURA
        ) {
          return true;
        }
        return false;
      }),
    };
  }

  async generateCsv(paginationParams: PaginationParams, user: User) {
    const { year, edition, county, school } = paginationParams;

    const series = await this.conection.getRepository(Serie).find({
      where: {
        SER_ATIVO: true,
      },
    });

    delete paginationParams?.schoolClass;
    const findEdition = await this.conection.getRepository(Assessment).findOne({
      where: {
        AVA_ID: edition,
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

    const items = [];

    for (const serie of series) {
      const data = await this.handle(
        {
          ...paginationParams,
          serie: String(serie.SER_ID),
        },
        user,
      );

      const dataSynthesisForSerie = {
        serie,
        ...data,
      };

      items.push(dataSynthesisForSerie);
    }

    const data = [];

    const base_consulta = `${year} > ${findEdition?.AVA_NOME}${
      !!county ? ` > ${findCounty?.MUN_NOME}` : ""
    }${!!school ? ` > ${findSchool?.ESC_NOME}` : ""}`;

    items?.forEach((item) => {
      item.items.forEach((subject) => {
        subject.items.forEach((subjectItem) => {
          const formattedDataSubject =
            subject.typeSubject === "Objetiva"
              ? {
                  serie: item?.serie?.SER_NOME ?? "",
                  disciplina: subject?.subject ?? "",
                  base_consulta,
                  nivel_consulta: subjectItem?.name ?? "",
                  total_alunos: subjectItem.countTotalStudents,
                  total_participantes: subjectItem.countPresentStudents,
                  objetiva_total_acertos: subjectItem.totalGradesStudents,
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
                  serie: item?.serie?.SER_NOME ?? "",
                  disciplina: subject?.subject ?? "",
                  base_consulta,
                  nivel_consulta: subjectItem?.name ?? "",
                  total_alunos: subjectItem.countTotalStudents,
                  total_participantes: subjectItem.countPresentStudents,
                  objetiva_total_acertos: 0,
                  fluente: subjectItem.fluente,
                  nao_fluente: subjectItem.nao_fluente,
                  frases: subjectItem.frases,
                  palavras: subjectItem.palavras,
                  silabas: subjectItem.silabas,
                  nao_leitor: subjectItem.nao_leitor,
                  nao_avaliado: subjectItem.nao_avaliado,
                  nao_informado: subjectItem.nao_informado,
                };
          data.push(formattedDataSubject);
        });
      });
    });

    const parser = new Parser({
      quote: " ",
      withBOM: true,
    });

    try {
      const csv = parser.parse(data);
      return csv;
    } catch (error) {
      console.log("error csv:", error.message);
    }
  }

  calculateMinMedMax(numbers: number[]) {
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);

    const total = numbers.reduce((acc, cur) => acc + cur, 0);
    const avg = Math.round(total / numbers.length);

    return {
      min,
      max,
      avg,
    };
  }
}
