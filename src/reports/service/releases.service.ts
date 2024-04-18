import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import {
  paginate,
  Pagination,
  PaginationTypeEnum,
} from "nestjs-typeorm-paginate";
import { Assessment } from "src/assessment/model/entities/assessment.entity";
import { PaginationParams } from "src/helpers/params";
import { StudentTest } from "src/release-results/model/entities/student-test.entity";
import { SchoolClass } from "src/school-class/model/entities/school-class.entity";
import { Serie } from "src/serie/model/entities/serie.entity";
import { Student } from "src/student/model/entities/student.entity";
import { User } from "src/user/model/entities/user.entity";
import { Connection, Repository } from "typeorm";
import { ReportEdition } from "../model/entities/report-edition.entity";
import { EvolutionaryLineService } from "./evolutionary-line.service";

@Injectable()
export class ReleasesService {
  constructor(
    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,

    @InjectRepository(ReportEdition)
    private reportEditionRepository: Repository<ReportEdition>,

    @InjectRepository(Serie)
    private seriesClassRepository: Repository<Serie>,

    private readonly evolutionaryLineService: EvolutionaryLineService,

    @InjectConnection()
    private readonly conection: Connection,
  ) {}

  async handle(paginationParams: PaginationParams, user: User) {
    const { county, year, serie, page, limit, edition, school, schoolClass } =
      paginationParams;

      let formattedCounty = county;
      let formattedSchool = school;
  
      if(user?.USU_SPE?.SPE_PER?.PER_NOME !== 'SAEV') {
        formattedCounty = user?.USU_MUN?.MUN_ID;
      }
  
      if (user?.USU_SPE?.SPE_PER?.PER_NOME === "Escola") {
        formattedSchool = user?.USU_ESC?.ESC_ID;
       }

    const series = await this.seriesClassRepository
      .createQueryBuilder("SERIE")
      .where("SERIE.SER_ID IN (:series)", {
        series: serie?.split(","),
      })
      .orderBy("SERIE.SER_NOME", "ASC")
      .getMany();

    const queryAsses = this.assessmentRepository
      .createQueryBuilder("AVALIACAO")
      .leftJoin("AVALIACAO.AVA_AVM", "AVA_AVM")
      .leftJoin("AVA_AVM.AVM_MUN", "AVM_MUN")
      .leftJoin("AVM_MUN.schools", "schools")
      .leftJoinAndSelect("AVALIACAO.AVA_TES", "AVA_TES")
      .leftJoinAndSelect("AVA_TES.TES_DIS", "TES_DIS");

    if (edition) {
      queryAsses.andWhere("AVALIACAO.AVA_ID = :AVA_ID", {
        AVA_ID: edition,
      });
    }
    if (formattedSchool) {
      queryAsses.andWhere("schools.ESC_ID = :school", { school: formattedSchool });
    } else if (formattedCounty) {
      queryAsses.andWhere("AVM_MUN.MUN_ID = :county", { county: formattedCounty });
    }

    let dataAsses: Assessment;
    let idsStudents = [];
    if (schoolClass) {
      const serieBySchoolClass = await this.conection
        .getRepository(SchoolClass)
        .findOne({
          where: {
            TUR_ID: schoolClass,
          },
          relations: ["TUR_SER"],
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

      idsStudents = reportEdition?.reportsSubjects[0]?.idStudents;

      queryAsses.innerJoin(
        "AVA_TES.TES_SER",
        "TES_SER",
        `TES_SER.SER_ID IN (:series)`,
        {
          series: serieBySchoolClass.TUR_SER.SER_ID,
        },
      );
      dataAsses = await queryAsses.getOne();
    }
    let items = [];

    const queryReports = this.reportEditionRepository
      .createQueryBuilder("report")
      .leftJoinAndSelect("report.edition", "edition")
      .leftJoinAndSelect("report.schoolClass", "school_class")
      .leftJoinAndSelect("school_class.TUR_SER", "TUR_SER")
      .leftJoinAndSelect("report.school", "school")
      .leftJoinAndSelect("report.county", "county")
      .leftJoin("school.ESC_MUN", "ESC_MUN")
      .leftJoinAndSelect("report.reportsSubjects", "reportsSubjects")
      .leftJoinAndSelect("reportsSubjects.test", "test")
      .leftJoinAndSelect("test.TES_DIS", "TES_DIS")

      .innerJoinAndSelect(
        "test.TES_SER",
        "TES_SER",
        `TES_SER.SER_ID IN (:series)`,
        {
          series: serie?.split(","),
        },
      )
      .leftJoin("school_class.TUR_ESC", "TUR_ESC");

    if (edition) {
      queryReports.where("edition.AVA_ID = :id", { id: edition });
    }

    if (year) {
      queryReports.andWhere("edition.AVA_ANO = :year", { year });
    }

    if (formattedSchool) {
      queryReports.andWhere("TUR_ESC.ESC_ID = :school", { school:formattedSchool });
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
    } else if (serie) {
      queryReports.andWhere(
        "county.MUN_ID IS NULL and school.ESC_ID IS NULL and school_class.TUR_ID IS NULL",
      );
    }

    let data: Pagination<ReportEdition>;

    if (!schoolClass) {
      const totalItems = await queryReports.getCount();

      data = await paginate(queryReports, {
        page: +page,
        limit: +limit,
        paginationType: PaginationTypeEnum.TAKE_AND_SKIP,
        metaTransformer: ({ currentPage, itemCount, itemsPerPage }) => {
          const totalPages = Math.ceil(totalItems / itemsPerPage);
          return {
            currentPage,
            itemCount,
            itemsPerPage,
            totalItems,
            totalPages: totalPages === 0 ? 1 : totalPages,
          };
        },
      });
    }

    if (schoolClass) {
      if (dataAsses && idsStudents?.length) {
        items = await Promise.all(
          idsStudents?.map(async (ALU_ID) => {
            let isParticipatedAll = true;

            const student = await this.conection
              .getRepository(Student)
              .createQueryBuilder("Student")
              .select([
                "Student.ALU_ID",
                "Student.ALU_NOME",
                "Student.ALU_INEP",
              ])
              .where("Student.ALU_ID = :idStudent", { idStudent: ALU_ID })
              .getOne();
            const subjects = await Promise.all(
              dataAsses?.AVA_TES?.map(async (dataTest) => {
                const studentTest = await this.conection
                  .getRepository(StudentTest)
                  .createQueryBuilder("ALUNO_TESTE")
                  .where(
                    `ALUNO_TESTE.ALT_ALU_ID = '${ALU_ID}' AND ALUNO_TESTE.ALT_TES_ID = '${dataTest?.TES_ID}'`,
                  )
                  .andWhere("ALUNO_TESTE.schoolClass = :schoolClass", {
                    schoolClass,
                  })
                  .getOne();

                if (!studentTest) {
                  isParticipatedAll = false;
                  return {
                    id: dataTest.TES_DIS.DIS_ID,
                    name: dataTest.TES_DIS.DIS_NOME,
                    isRelease: false,
                  };
                }

                const isParticipated = !!studentTest;

                if (!isParticipated) {
                  isParticipatedAll = false;
                }

                return {
                  id: dataTest.TES_DIS.DIS_ID,
                  name: dataTest.TES_DIS.DIS_NOME,
                  isRelease: isParticipated,
                };
              }),
            );

            return {
              id: student.ALU_ID,
              name: student.ALU_NOME,
              inep: student.ALU_INEP,
              subjects,
              general: !!subjects?.length ? isParticipatedAll : false,
            };
          }),
        );
      }
    } else if (formattedSchool) {
      items = data.items?.map((schoolClassTest) => {
        const grouped = schoolClassTest.reportsSubjects[0].countTotalStudents;

        const subjects = schoolClassTest.reportsSubjects.map((test) => {
          return {
            id: test?.test?.TES_DIS.DIS_ID,
            name: test?.test?.TES_DIS.DIS_NOME,
            grouped: test.countTotalStudents,

            percentageFinished:
              test.countTotalStudents > 0
                ? Math.round(
                    (test.countStudentsLaunched / test.countTotalStudents) *
                      100,
                  )
                : 0,
          };
        });

        const value = subjects.reduce((acc, cur) => {
          return acc + cur.percentageFinished;
        }, 0);

        const reduce = subjects.reduce((acc, cur) => {
          if (acc[cur.name]) {
            acc[cur.name] = {
              value: acc[cur.name].value + cur.percentageFinished,
              count: acc[cur.name].count + 1,
            };
          } else {
            acc[cur.name] = {
              value: cur.percentageFinished,
              count: 1,
            };
          }

          return acc;
        }, {});

        let filterSubjects = subjects.filter(function (a) {
          return (
            !this[JSON.stringify(a?.name)] &&
            (this[JSON.stringify(a?.name)] = true)
          );
        }, Object.create(null));

        filterSubjects = filterSubjects.map((subject) => {
          return {
            ...subject,
            percentageFinished: Math.round(
              reduce[subject.name].value / reduce[subject.name].count,
            ),
          };
        });

        return {
          id: schoolClassTest.schoolClass.TUR_ID,
          classe: schoolClassTest.schoolClass.TUR_NOME,
          name: schoolClassTest.schoolClass.TUR_SER.SER_NOME,
          grouped,
          math: 0,
          portuguese: 0,
          reading: 0,
          subjects: filterSubjects,
          general: Math.round(value / subjects.length),
        };
      });
    } else if (formattedCounty) {
      items = data.items?.map((schoolClassTest) => {
        const filterReportSubjects = schoolClassTest.reportsSubjects
          .sort((a, b) => b.countTotalStudents - a.countTotalStudents)
          .filter(function (a) {
            return (
              !this[JSON.stringify(a?.test.TES_SER.SER_ID)] &&
              (this[JSON.stringify(a?.test.TES_SER.SER_ID)] = true)
            );
          }, Object.create(null));
        const grouped = filterReportSubjects.reduce(
          (acc, cur) => acc + cur.countTotalStudents,
          0,
        );

        const subjects = schoolClassTest.reportsSubjects.map((test) => {
          return {
            id: test?.test?.TES_DIS.DIS_ID,
            name: test?.test?.TES_DIS.DIS_NOME,
            grouped: test.countTotalStudents,

            percentageFinished:
              test.countTotalStudents > 0
                ? Math.round(
                    (test.countStudentsLaunched / test.countTotalStudents) *
                      100,
                  )
                : 0,
          };
        });

        const value = subjects.reduce((acc, cur) => {
          return acc + cur.percentageFinished;
        }, 0);

        const reduce = subjects.reduce((acc, cur) => {
          if (acc[cur.name]) {
            acc[cur.name] = {
              value: acc[cur.name].value + cur.percentageFinished,
              count: acc[cur.name].count + 1,
            };
          } else {
            acc[cur.name] = {
              value: cur.percentageFinished,
              count: 1,
            };
          }

          return acc;
        }, {});

        let filterSubjects = subjects.filter(function (a) {
          return (
            !this[JSON.stringify(a?.name)] &&
            (this[JSON.stringify(a?.name)] = true)
          );
        }, Object.create(null));

        filterSubjects = filterSubjects.map((subject) => {
          return {
            ...subject,
            percentageFinished: Math.round(
              reduce[subject.name].value / reduce[subject.name].count,
            ),
          };
        });

        return {
          id: schoolClassTest.school.ESC_ID,
          classe: null,
          name: schoolClassTest.school.ESC_NOME,
          inep: schoolClassTest.school.ESC_INEP,
          grouped,
          math: 0,
          portuguese: 0,
          reading: 0,
          subjects: filterSubjects,
          general: Math.round(value / subjects.length),
        };
      });
    } else if (edition) {
      items = data.items?.map((schoolClassTest) => {
        const filterReportSubjects = schoolClassTest.reportsSubjects
          .sort((a, b) => b.countTotalStudents - a.countTotalStudents)
          .filter(function (a) {
            return (
              !this[JSON.stringify(a?.test.TES_SER.SER_ID)] &&
              (this[JSON.stringify(a?.test.TES_SER.SER_ID)] = true)
            );
          }, Object.create(null));
        const grouped = filterReportSubjects.reduce(
          (acc, cur) => acc + cur.countTotalStudents,
          0,
        );

        const subjects = schoolClassTest.reportsSubjects.map((test) => {
          return {
            id: test?.test?.TES_DIS.DIS_ID,
            name: test?.test?.TES_DIS.DIS_NOME,
            grouped: test.countTotalStudents,

            percentageFinished:
              test.countTotalStudents > 0
                ? Math.round(
                    (test.countStudentsLaunched / test.countTotalStudents) *
                      100,
                  )
                : 0,
          };
        });

        const value = subjects.reduce((acc, cur) => {
          return acc + cur.percentageFinished;
        }, 0);

        const reduce = subjects.reduce((acc, cur) => {
          if (acc[cur.name]) {
            acc[cur.name] = {
              value: acc[cur.name].value + cur.percentageFinished,
              count: acc[cur.name].count + 1,
            };
          } else {
            acc[cur.name] = {
              value: cur.percentageFinished,
              count: 1,
            };
          }

          return acc;
        }, {});

        let filterSubjects = subjects.filter(function (a) {
          return (
            !this[JSON.stringify(a?.name)] &&
            (this[JSON.stringify(a?.name)] = true)
          );
        }, Object.create(null));

        filterSubjects = filterSubjects.map((subject) => {
          return {
            ...subject,
            percentageFinished: Math.round(
              reduce[subject.name].value / reduce[subject.name].count,
            ),
          };
        });

        return {
          id: schoolClassTest.county.MUN_ID,
          name: schoolClassTest.county.MUN_NOME,
          grouped,
          math: 0,
          portuguese: 0,
          reading: 0,
          subjects: filterSubjects,
          general: Math.round(value / subjects.length),
        };
      });
    } else if (serie) {
      items = data.items?.map((schoolClassTest) => {
        const filterReportSubjects = schoolClassTest.reportsSubjects
          .sort((a, b) => b.countTotalStudents - a.countTotalStudents)
          .filter(function (a) {
            return (
              !this[JSON.stringify(a?.test.TES_SER.SER_ID)] &&
              (this[JSON.stringify(a?.test.TES_SER.SER_ID)] = true)
            );
          }, Object.create(null));
        const grouped = filterReportSubjects.reduce(
          (acc, cur) => acc + cur.countTotalStudents,
          0,
        );

        const subjects = schoolClassTest.reportsSubjects.map((test) => {
          return {
            id: test?.test?.TES_DIS.DIS_ID,
            name: test?.test?.TES_DIS.DIS_NOME,
            grouped: test.countTotalStudents,

            percentageFinished:
              test.countTotalStudents > 0
                ? Math.round(
                    (test.countStudentsLaunched / test.countTotalStudents) *
                      100,
                  )
                : 0,
          };
        });

        const value = subjects.reduce((acc, cur) => {
          return acc + cur.percentageFinished;
        }, 0);

        const reduce = subjects.reduce((acc, cur) => {
          if (acc[cur.name]) {
            acc[cur.name] = {
              value: acc[cur.name].value + cur.percentageFinished,
              count: acc[cur.name].count + 1,
            };
          } else {
            acc[cur.name] = {
              value: cur.percentageFinished,
              count: 1,
            };
          }

          return acc;
        }, {});

        let filterSubjects = subjects.filter(function (a) {
          return (
            !this[JSON.stringify(a?.name)] &&
            (this[JSON.stringify(a?.name)] = true)
          );
        }, Object.create(null));

        filterSubjects = filterSubjects.map((subject) => {
          return {
            ...subject,
            percentageFinished: Math.round(
              reduce[subject.name].value / reduce[subject.name].count,
            ),
          };
        });

        return {
          id: schoolClassTest.edition.AVA_ID,
          name: schoolClassTest.edition.AVA_NOME,
          grouped,
          math: 0,
          portuguese: 0,
          reading: 0,
          subjects: filterSubjects,
          general: Math.round(value / subjects.length),
        };
      });
    }

    const totalByFilter = {
      total_schools: formattedCounty && !formattedSchool ? data.meta.totalItems : 0,
      total_mun: edition && !formattedCounty ? data.meta.totalItems : 0,
      total_schoolClasses:
        (formattedSchool && !schoolClass && data.meta.totalItems) || (schoolClass && 1),
    };

    const formattedSeries = await Promise.all(
      series.map(async (ser) => {
        const assessments = await this.evolutionaryLineService.evolutionaryLine(
          {
            page: 1,
            limit: 10,
            order: "ASC",
            year,
            serie: ser.SER_ID,
            county: formattedCounty,
            edition,
            school: formattedSchool,
            schoolClass,
          } as any,
          user,
          true,
        );

        let tests = [];

        assessments.items.forEach((asses) => {
          tests.push(...asses.subjects);
        });

        const value = tests.reduce((acc, cur) => {
          return acc + cur.percentageFinished;
        }, 0);

        return {
          id: ser.SER_ID,
          name: ser.SER_NOME,
          value: !!value ? +(value / tests.length).toFixed(2) : 0,
        };
      }),
    );

    return {
      series: {
        type: "bar",
        level: "serie",
        total_schoolClasses: totalByFilter.total_schoolClasses,
        total_schools: totalByFilter.total_schoolClasses
          ? 1
          : totalByFilter.total_schools,
        total_mun:
          totalByFilter.total_schoolClasses || totalByFilter.total_schools
            ? 1
            : totalByFilter.total_mun,
        items: formattedSeries,
      },
      items,
      meta: !!schoolClass ? {} : data.meta,
    };
  }
}
