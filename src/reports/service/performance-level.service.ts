import { Injectable } from "@nestjs/common";
import * as _ from "lodash";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import { paginate, PaginationTypeEnum } from "nestjs-typeorm-paginate";
import { Assessment } from "src/assessment/model/entities/assessment.entity";
import { PaginationParams } from "src/helpers/params";
import { StudentTestAnswer } from "src/release-results/model/entities/student-test-answer.entity";
import { StudentTest } from "src/release-results/model/entities/student-test.entity";
import { Subject } from "src/subject/model/entities/subject.entity";
import { User } from "src/user/model/entities/user.entity";
import { Connection, Not, Repository } from "typeorm";
import { ReportEdition } from "../model/entities/report-edition.entity";
import { Student } from "src/student/model/entities/student.entity";

@Injectable()
export class PerformanceLevelService {
  constructor(
    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,

    @InjectRepository(ReportEdition)
    private reportEditionRepository: Repository<ReportEdition>,

    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async handle(paginationParams: PaginationParams, user: User) {
    const {
      county,
      page,
      limit,
      edition,
      school,
      year,
      serie,
      schoolClass,
      order,
    } = paginationParams;

    let formattedCounty = county;
    let formattedSchool = school;

    if(user?.USU_SPE?.SPE_PER?.PER_NOME !== 'SAEV') {
      formattedCounty = user?.USU_MUN?.MUN_ID;
    }

    if (user?.USU_SPE?.SPE_PER?.PER_NOME === "Escola") {
      formattedSchool = user?.USU_ESC?.ESC_ID;
     }

    const orderBy = order === "ASC" ? "ASC" : "DESC";

    if (schoolClass) {
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
        .leftJoinAndSelect("AVA_TES.TES_DIS", "TES_DIS")
        .where("TES_DIS.DIS_TIPO != :type", { type: "Leitura" });

        const reportEdition = await this.connection
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

      if (edition) {
        queryBuilder.andWhere("AVALIACAO.AVA_ID = :AVA_ID", {
          AVA_ID: edition,
        });
      }
      if (formattedSchool) {
        queryBuilder.andWhere("schools.ESC_ID = :school", { school:formattedSchool });
      } else if (formattedCounty) {
        queryBuilder.andWhere("AVM_MUN.MUN_ID = :county", { county:formattedCounty });
      }

      const ava = await queryBuilder.getOne();

      let items = [];

      if(ava && idsStudents?.length) {
        items = await Promise.all(ava?.AVA_TES?.map(async (test) => {
          let DESCRIPTORS_TEMPLATE = test.TEMPLATE_TEST.filter(function (a) {
            return (
              !this[JSON.stringify(a?.TEG_MTI?.MTI_ID)] &&
              (this[JSON.stringify(a?.TEG_MTI?.MTI_ID)] = true)
            );
          }, Object.create(null));
  
          DESCRIPTORS_TEMPLATE = DESCRIPTORS_TEMPLATE.sort((a, b) => {
            if (a?.TEG_MTI?.MTI_CODIGO < b?.TEG_MTI?.MTI_CODIGO) {
              return -1;
            } else {
              return 1;
            }
          });
  
          let totalRightSchoolClass = 0;
          let totalQuestionSchoolClass = 0;
  
          let totalDescriptors = [];         
            
          let STUDENTS_TEST = await Promise.all(idsStudents.map(async (ALU_ID, index) => {
            const student = await this.connection
            .getRepository(Student)
            .createQueryBuilder("Student")
            .select(["Student.ALU_ID", "Student.ALU_NOME"])
            .where("Student.ALU_ID = :idStudent", { idStudent: ALU_ID })
            .getOne();
            
            const studentTest = await this.connection
              .getRepository(StudentTest)
              .createQueryBuilder("ALUNO_TESTE")
              .innerJoinAndSelect("ALUNO_TESTE.ANSWERS_TEST", "ANSWERS_TEST")
              .leftJoinAndSelect("ANSWERS_TEST.questionTemplate", "questionTemplate")
              .leftJoinAndSelect("questionTemplate.TEG_MTI", "TEG_MTI")
              .where(
                `ALUNO_TESTE.ALT_ALU_ID = '${ALU_ID}' AND ALUNO_TESTE.ALT_TES_ID = '${test?.TES_ID}'`,
              )
              .andWhere('ALUNO_TESTE.schoolClass = :schoolClass', {schoolClass})
              .getOne(); 

              const ANSWERS_TEST = studentTest?.ANSWERS_TEST?.filter((arr, index, self) =>
              index === self.findIndex((t) => (t?.questionTemplate?.TEG_ID === arr?.questionTemplate?.TEG_ID)))
            
            const descriptors = DESCRIPTORS_TEMPLATE.map((data) => {
              let answersDescriptors: StudentTestAnswer[] = [];
  
              ANSWERS_TEST?.forEach((answer) => {
                if (answer?.questionTemplate?.TEG_MTI?.MTI_ID === data?.TEG_MTI?.MTI_ID) {
                  answersDescriptors.push(answer);
                }
                totalQuestionSchoolClass += 1;
                if(answer?.ATR_CERTO) {
                  totalRightSchoolClass += 1;
                }
              });
  
              const STUDENTS_RIGHT = answersDescriptors.reduce(
                (sum, cur) => {
                  if (cur.ATR_CERTO) {
                    return {
                      right: sum.right + 1,
                      total: sum.total + 1,
                    };
                  } else {
                    return {
                      right: sum.right,
                      total: sum.total + 1,
                    };
                  }
                },
                {
                  right: 0,
                  total: 0,
                },
              );
  
              return {
                id: data.TEG_ID,
                cod: data.TEG_MTI?.MTI_CODIGO,
                description: data.TEG_MTI?.MTI_DESCRITOR,
                totalCorrect: STUDENTS_RIGHT.right,
                total: STUDENTS_RIGHT.total,
                value:
                  +Math.round(
                    (STUDENTS_RIGHT.right / STUDENTS_RIGHT.total) * 100,
                  ) ?? 0,
              };
            });
  
            totalDescriptors.push(...descriptors)
            
  
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
  
  
            return {
              id: student.ALU_ID,
              name: student.ALU_NOME,
              value: !!STUDENTS_RIGHT ?+Math.round(
                (STUDENTS_RIGHT / test?.TEMPLATE_TEST?.length) * 100,
              ) : 0,
              descriptors,
            };
          }));
          
          const dataGroupped = _.groupBy(
            totalDescriptors,
            (line) =>
              line.id +
              " " +
              line.cod,
          );
      
          const keyTurmas = Object.keys(dataGroupped);
  
          const descriptors = keyTurmas.map((key) => {
            const reduce = dataGroupped[key].reduce((acc, cur) => {
              return {
                total: acc.total + cur?.total,
                totalCorrect: acc.totalCorrect + cur?.totalCorrect,
              }
            }, {
              total: 0,
              totalCorrect: 0,
            })
  
            return {
              id: dataGroupped[key][0]?.id,
              cod: dataGroupped[key][0]?.cod,
              description: dataGroupped[key][0]?.description,
              value: Math.round(
                (reduce.totalCorrect / reduce.total) *
                  100)
            }
          })
  
          const TOTAL_STUDENTS =
            this.calculateTotalQuestionsUsersByNivel(STUDENTS_TEST);
          return {
            id: test.TES_DIS.DIS_ID,
            name: test.TES_DIS.DIS_NOME,
            type: test.TES_DIS.DIS_TIPO,
            TOTAL_STUDENTS,
            descriptors,
            DESCRIPTORS_TEMPLATE,
            value: Math.round(
              (totalRightSchoolClass / totalQuestionSchoolClass) * 100,
            ),
            items: STUDENTS_TEST,
          };
        }));
      }

      return {
        items,
        meta: {
          totalItems: 0,
          itemCount: 0,
          totalPages: 0,
        },
      };
    }

    const subjects = await this.connection.getRepository(Subject).find({
      where: {
        DIS_TIPO: Not("Leitura"),
      },
    });

    const queryReports = this.reportEditionRepository
      .createQueryBuilder("report")
      .innerJoin("report.edition", "edition")
      .leftJoinAndSelect("report.reports_descriptors", "reports_descriptors")
      // .leftJoinAndSelect("report.reportsSubjects", "reportsSubjects")
      // .innerJoinAndSelect("reportsSubjects.test", "testSubject")
      .innerJoinAndSelect("reports_descriptors.descriptor", "descriptor")
      .innerJoinAndSelect("reports_descriptors.test", "test")
      .innerJoinAndSelect("test.TES_DIS", "TES_DIS")
      .innerJoin("test.TES_SER", "TES_SER", `TES_SER.SER_ID IN (:series)`, {
        series: serie?.split(","),
      })

      const queryReportsSubjects = this.reportEditionRepository
      .createQueryBuilder("report")
      .innerJoin("report.edition", "edition")
      .leftJoinAndSelect("report.reportsSubjects", "reportsSubjects")
      .innerJoinAndSelect("reportsSubjects.test", "test")
      .innerJoinAndSelect("test.TES_DIS", "TES_DIS")
      .innerJoin("test.TES_SER", "TES_SER", `TES_SER.SER_ID IN (:series)`, {
        series: serie?.split(","),
      })


    if (edition) {
      queryReports.where("edition.AVA_ID = :id", { id: edition });
      queryReportsSubjects.where("edition.AVA_ID = :id", { id: edition });
    }

    if (year) {
      queryReports.andWhere("edition.AVA_ANO = :year", { year });
      queryReportsSubjects.andWhere("edition.AVA_ANO = :year", { year });
    }

    if (formattedSchool) {
      queryReports
        .leftJoinAndSelect("report.schoolClass", "schoolClass")
        .leftJoinAndSelect("schoolClass.TUR_SER", "TUR_SER")
        .leftJoin("schoolClass.TUR_ESC", "TUR_ESC")
        .andWhere("TUR_ESC.ESC_ID = :school", { school:formattedSchool });

        queryReportsSubjects
        .leftJoin("report.schoolClass", "schoolClass")
        .leftJoin("schoolClass.TUR_SER", "TUR_SER")
        .leftJoin("schoolClass.TUR_ESC", "TUR_ESC")
        .andWhere("TUR_ESC.ESC_ID = :school", { school:formattedSchool });
    } else if (formattedCounty) {
      queryReports
        .leftJoinAndSelect("report.school", "school")
        .leftJoin("school.ESC_MUN", "ESC_MUN")
        .andWhere("ESC_MUN.MUN_ID = :county", { county: formattedCounty });

        queryReportsSubjects
        .leftJoin("report.school", "school")
        .leftJoin("school.ESC_MUN", "ESC_MUN")
        .andWhere("ESC_MUN.MUN_ID = :county", { county:formattedCounty });
      if (user.USU_SPE.SPE_PER.PER_NOME === "Escola") {
        queryReports.andWhere("school.ESC_ID = :school", { school: user?.USU_ESC?.ESC_ID });
        queryReportsSubjects.andWhere("school.ESC_ID = :school", { school: user?.USU_ESC?.ESC_ID });
      }
    } else if (edition) {
      queryReports
        .leftJoinAndSelect("report.county", "county")
        .andWhere("county.MUN_ID IS NOT NULL");

        queryReportsSubjects
        .leftJoin("report.county", "county")
        .andWhere("county.MUN_ID IS NOT NULL");
      if (user.USU_SPE.SPE_PER.PER_NOME !== "SAEV") {
        queryReports.andWhere("county.MUN_ID = :county", { county: user?.USU_MUN?.MUN_ID });
        queryReportsSubjects.andWhere("county.MUN_ID = :county", { county: user?.USU_MUN?.MUN_ID });
      }
    } else if (serie) {
      queryReports.andWhere(
        "county.MUN_ID IS NULL and school.ESC_ID IS NULL and schoolClass.TUR_ID IS NULL",
      );

      queryReportsSubjects.andWhere(
        "county.MUN_ID IS NULL and school.ESC_ID IS NULL and schoolClass.TUR_ID IS NULL",
      );
    }


    const data = await paginate(queryReports, {
      page: +page,
      limit: +limit,
      paginationType: PaginationTypeEnum.TAKE_AND_SKIP,
      countQueries: false
    });

    const dataReportsSubject = await paginate(queryReportsSubjects, {
      page: +page,
      limit: +limit,
      paginationType: PaginationTypeEnum.TAKE_AND_SKIP,
      countQueries: false
    });

    const reports_editions = data.items;
    let formattedSubjects = [];
    let items = [];
    if (reports_editions?.length) {
      formattedSubjects = subjects.map((subject) => {
        let isExistsDescriptorInSubject = false;
        let totalDescriptors = [];
        let totalGradesStudents = 0;
        let countPresentStudents = 0;
        const items = reports_editions.map((report_edition) => {
          const editionReportSubject = dataReportsSubject?.items?.find((editionReportSubject) => editionReportSubject.id === report_edition.id)

          let id;
          let name = "";

          if (formattedSchool) {
            id = report_edition.schoolClass?.TUR_ID;
            name = report_edition.schoolClass?.TUR_NOME;
          } else if (formattedCounty) {
            id = report_edition.school?.ESC_ID;
            name = report_edition.school?.ESC_NOME;
          } else if (edition) {
            id = report_edition.county?.MUN_ID;
            name = report_edition.county?.MUN_NOME;
          } else {
            id = report_edition.edition.AVA_ID;
            name = report_edition.edition.AVA_NOME;
          }

          let descriptors = [];
          report_edition.reports_descriptors.forEach((report_descriptor) => {
            if (subject.DIS_ID === report_descriptor.test.TES_DIS.DIS_ID) {
              isExistsDescriptorInSubject = true;
              const data = {
                id: report_descriptor.descriptor.MTI_ID,
                // TEG_ORDEM: report_descriptor.descriptor.,
                cod: report_descriptor.descriptor.MTI_CODIGO,
                idTest: report_descriptor.test.TES_ID,
                description: report_descriptor.descriptor.MTI_DESCRITOR,
                totalCorrect: report_descriptor.totalCorrect,
                total: report_descriptor.total,
                value:
                  +Math.round(
                    (report_descriptor.totalCorrect / report_descriptor.total) *
                      100,
                  ) ?? 0,
              };

              descriptors.push(data);
              totalDescriptors.push(data)
            }
          });

          const reportSubject = editionReportSubject?.reportsSubjects?.find((subject) => subject.test.TES_ID === descriptors[0]?.idTest)

          descriptors = descriptors.sort((a, b) => {
            if (a.cod < b.cod) {
              return -1;
            } else {
              return 1;
            }
          });

         

          if(!!reportSubject?.countPresentStudents) {
            totalGradesStudents+= reportSubject?.totalGradesStudents;
            countPresentStudents+= reportSubject?.countPresentStudents;
          }
          return {
            id,
            name,
            value: !!reportSubject?.countPresentStudents ? Math.round(
              reportSubject?.totalGradesStudents / reportSubject?.countPresentStudents,
            ) : 0,
            descriptors,
          };
        });

        const total = this.calculateTotalQuestionsUsersByNivel(items);

        const dataGroupped = _.groupBy(
          totalDescriptors,
          (line) =>
            line.id +
            " " +
            line.cod,
        );
    
        const keyTurmas = Object.keys(dataGroupped);

        const descriptors = keyTurmas.map((key) => {
          const reduce = dataGroupped[key].reduce((acc, cur) => {
            return {
              total: acc.total + cur?.total,
              totalCorrect: acc.totalCorrect + cur?.totalCorrect,
            }
          }, {
            total: 0,
            totalCorrect: 0,
          })

          return {
            id: dataGroupped[key][0]?.id,
            cod: dataGroupped[key][0]?.cod,
            description: dataGroupped[key][0]?.description,
            value: Math.round(
              (reduce.totalCorrect / reduce.total) *
                100)
          }
        })

        return {
          id: subject.DIS_ID,
          name: subject.DIS_NOME,
          type: subject.DIS_TIPO,
          isExistsDescriptorInSubject,
          TOTAL_STUDENTS: total,
          items,
          value: Math.round(
            totalGradesStudents / countPresentStudents,
          ),
          descriptors
        };
      });
    }
    formattedSubjects = formattedSubjects.filter(
      (data) => !!data.isExistsDescriptorInSubject,
    );


    return {
      items: formattedSubjects,
      meta: data.meta,
    };
  }

  private calculateTotalQuestionsUsersByNivel(data: any): {
    TOTAL: number;
    ONE: number;
    TWO: number;
    TREE: number;
    FOUR: number;
  } {
    const total = data?.reduce(
      (sum, cur: any) => {
        const value = cur.value;

        if (value >= 75) {
          return {
            ...sum,
            FOUR: sum.FOUR + 1,
            TOTAL: sum.TOTAL + 1,
          };
        } else if (value >= 50) {
          return {
            ...sum,
            TREE: sum.TREE + 1,
            TOTAL: sum.TOTAL + 1,
          };
        } else if (value >= 25) {
          return {
            ...sum,
            TWO: sum.TWO + 1,
            TOTAL: sum.TOTAL + 1,
          };
        } else {
          return {
            ...sum,
            ONE: sum.ONE + 1,
            TOTAL: sum.TOTAL + 1,
          };
        }
      },
      {
        ONE: 0,
        TWO: 0,
        TREE: 0,
        FOUR: 0,
        TOTAL: 0,
      },
    );

    return total;
  }
}
