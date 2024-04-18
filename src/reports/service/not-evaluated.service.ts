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
import { ReportEdition } from "../model/entities/report-edition.entity";
import { SchoolClass } from "src/school-class/model/entities/school-class.entity";

@Injectable()
export class NotEvaluatedService {
  constructor(
    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,

    @InjectRepository(ReportEdition)
    private reportEditionRepository: Repository<ReportEdition>,

    @InjectConnection()
    private readonly conection: Connection,
  ) {}

  async handle(paginationParams: PaginationParams, user: User) {
    const { county, edition, school, schoolClass, serie } = paginationParams;

    let formattedCounty = county;
    let formattedSchool = school;

    if (user?.USU_SPE?.SPE_PER?.PER_NOME !== "SAEV") {
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
        .innerJoinAndSelect(
          "ReportEdition.reports_not_evaluated",
          "reports_not_evaluated",
        )
        .innerJoin("reports_not_evaluated.test", "test")
        .innerJoin("test.TES_SER", "TES_SER", `TES_SER.SER_ID = :serie`, {
          serie,
        })
        .where("ReportEdition.schoolClass = :schoolClass", { schoolClass })
        .andWhere("ReportEdition.edition = :edition", { edition })
        .getOne();

      const idsStudents = reportEdition?.reports_not_evaluated[0]?.idStudents;

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
        queryBuilder.andWhere("schools.ESC_ID = :school", {
          school: formattedSchool,
        });
      } else if (formattedCounty) {
        queryBuilder.andWhere("AVM_MUN.MUN_ID = :county", {
          county: formattedCounty,
        });
      }

      const ava = await queryBuilder.getOne();

      let items = [];

      if (!!ava?.AVA_TES?.length && idsStudents?.length) {
        items = await Promise.all(
          ava?.AVA_TES?.map(async (test) => {
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
                  .where(
                    `ALUNO_TESTE.ALT_ALU_ID = '${ALU_ID}' AND ALUNO_TESTE.ALT_TES_ID = '${test?.TES_ID}'`,
                  )
                  .andWhere("ALUNO_TESTE.schoolClass = :schoolClass", {
                    schoolClass,
                  })
                  .getOne();

                const options = {
                  "Recusou-se a participar": "recusa",
                  "Faltou mas está Frequentando a escola": "ausencia",
                  "Abandonou a escola": "abandono",
                  "Foi Transferido para outra escola": "transferencia",
                  "Não participou por motivo de deficiência": "deficiencia",
                  "Motivos de deficiência": "deficiencia",
                  "Não participou": "nao_participou",
                };

                let justificativa = null;

                if (studentTest?.ALT_JUSTIFICATIVA) {
                  const option =
                    studentTest.ALT_JUSTIFICATIVA.trim() ?? undefined;
                  justificativa = options[option];
                }

                return {
                  id: student.ALU_ID,
                  name: student.ALU_NOME,
                  justificativa,
                  studentTest,
                };
              }),
            );

            const resultDataReading = STUDENTS_TEST.reduce(
              (acc, cur) => {
                return {
                  recusa:
                    cur.justificativa === "recusa"
                      ? acc.recusa + 1
                      : acc.recusa,
                  ausencia:
                    cur.justificativa === "ausencia"
                      ? acc.ausencia + 1
                      : acc.ausencia,
                  abandono:
                    cur.justificativa === "abandono"
                      ? acc.abandono + 1
                      : acc.abandono,
                  transferencia:
                    cur.justificativa === "transferencia"
                      ? acc.transferencia + 1
                      : acc.transferencia,
                  deficiencia:
                    cur.justificativa === "deficiencia"
                      ? acc.deficiencia + 1
                      : acc.deficiencia,
                  nao_participou:
                    cur.justificativa === "nao_participou"
                      ? acc.nao_participou + 1
                      : acc.nao_participou,
                  total_enturmados: acc.total_enturmados + 1,
                  total_alunos: acc.total_alunos + 1,
                };
              },
              {
                recusa: 0,
                ausencia: 0,
                abandono: 0,
                transferencia: 0,
                deficiencia: 0,
                nao_participou: 0,
                total_enturmados: 0,
                total_alunos: 0,
              },
            );

            return {
              id: test.TES_ID,
              subject: test.TES_DIS.DIS_NOME,
              level: "student",
              type: "table",
              students: STUDENTS_TEST,
              dataGraph: {
                ...resultDataReading,
              },
            };
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
      .innerJoinAndSelect(
        "report.reports_not_evaluated",
        "reports_not_evaluated",
      )
      .innerJoinAndSelect("reports_not_evaluated.test", "test")
      .innerJoin("test.TES_SER", "TES_SER", `TES_SER.SER_ID = :serie`, {
        serie,
      })
      .leftJoin("schoolClass.TUR_ESC", "TUR_ESC")
      .leftJoin("schoolClass.TUR_SER", "TUR_SER")
      .where("edition.AVA_ID = :id", { id: edition })
      .andWhere(
        "reports_not_evaluated.countStudentsLaunched > reports_not_evaluated.countPresentStudents",
      );

    if (formattedSchool) {
      queryReports.andWhere("TUR_ESC.ESC_ID = :school", {
        school: formattedSchool,
      });
    } else if (formattedCounty) {
      queryReports.andWhere("ESC_MUN.MUN_ID = :county", {
        county: formattedCounty,
      });
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
        let totalStudents = 0;
        let countLaunchedStudents = 0;
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

            const findTest = report.reports_not_evaluated.find(
              (testReport) => testReport.test.TES_ID === test.TES_ID,
            );

            if (!findTest) {
              return null;
            }

            totalStudents += findTest.countTotalStudents;
            countLaunchedStudents += findTest.countStudentsLaunched;

            return {
              ...findTest,
              id,
              name,
            };
          })
          .filter((item) => item);

        const resultDataReading = values.reduce(
          (acc, cur) => {
            return {
              recusa: acc.recusa + cur.recusa,
              ausencia: acc.ausencia + cur.ausencia,
              abandono: acc.abandono + cur.abandono,
              transferencia: acc.transferencia + cur.transferencia,
              deficiencia: acc.deficiencia + cur.deficiencia,
              nao_participou: acc.nao_participou + cur.nao_participou,
              total_alunos: acc.total_alunos + cur.countTotalStudents,
              total_enturmados: acc.total_enturmados + cur.countTotalStudents,
              total_nao_avaliados: 0,
              total_lancados: acc.total_lancados + cur.countStudentsLaunched,
            };
          },
          {
            recusa: 0,
            ausencia: 0,
            abandono: 0,
            transferencia: 0,
            deficiencia: 0,
            nao_participou: 0,
            total_alunos: 0,
            total_enturmados: 0,
            total_lancados: 0,
            total_nao_avaliados: 0,
          },
        );

        resultDataReading.total_nao_avaliados =
          resultDataReading.recusa +
          resultDataReading.ausencia +
          resultDataReading.abandono +
          resultDataReading.transferencia +
          resultDataReading.deficiencia +
          resultDataReading.nao_participou;

        return {
          id: test.TES_ID,
          subject: test.TES_DIS.DIS_NOME,
          typeSubject: test.TES_DIS.DIS_TIPO,
          level,
          type: "bar",
          items: values,
          dataGraph: {
            ...resultDataReading,
          },
        };
      });
    }

    return {
      items,
    };
  }

  async generateCsv(paginationParams: PaginationParams, user: User) {
    const { year, edition, county, school, serie, schoolClass } =
      paginationParams;

    const findEdition = await this.conection.getRepository(Assessment).findOne({
      where: {
        AVA_ID: edition,
      },
    });

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

    const base_consulta = `${year} > ${findEdition?.AVA_NOME}${
      !!county ? ` > ${findCounty?.MUN_NOME}` : ""
    }${!!school ? ` > ${findSchool?.ESC_NOME}` : ""}${!!schoolClass ? ` > ${findSchoolClass?.TUR_NOME}` : ""}`;

    items.forEach((item) => {
      if (schoolClass) {
        item.students.forEach((student) => {
          const formattedDataSubject = {
            serie: findSerie?.SER_NOME ?? "",
            disciplina: item?.subject ?? "",
            base_consulta,
            name: student?.name ?? "",
            justificativa: student?.studentTest?.ALT_JUSTIFICATIVA?.trim() ? student?.studentTest?.ALT_JUSTIFICATIVA : "N/A",
          };
          data.push(formattedDataSubject);
        });
      } else {
        item.items.forEach((subjectItem) => {
          const formattedDataSubject = {
            serie: findSerie?.SER_NOME ?? "",
            disciplina: item?.subject ?? "",
            base_consulta,
            nivel_consulta: subjectItem?.name ?? "",
            total_alunos: subjectItem.countTotalStudents,
            total_lancados: subjectItem.countStudentsLaunched,
            total_participantes: subjectItem.countPresentStudents,
            total_nao_avaliados:
              subjectItem.countStudentsLaunched -
              subjectItem.countPresentStudents,
            recusou_participar: subjectItem.recusa,
            faltou_mas_frequentando_escola: subjectItem.ausencia,
            abandonou_escola: subjectItem.abandono,
            transferido_para_outra_escola: subjectItem.transferencia,
            motivos_deficiencia: subjectItem.deficiencia,
            nao_participou: subjectItem.nao_participou,
          };
          data.push(formattedDataSubject);
        });
      }
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
}
