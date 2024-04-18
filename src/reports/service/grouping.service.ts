import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import {
  paginate,
  Pagination,
  PaginationTypeEnum,
} from "nestjs-typeorm-paginate";
import { County } from "src/counties/model/entities/county.entity";
import getLastPage from "src/helpers/calculate-last-page";
import { PaginationParams } from "src/helpers/params";
import { SchoolClass } from "src/school-class/model/entities/school-class.entity";
import { School } from "src/school/model/entities/school.entity";
import { Serie } from "src/serie/model/entities/serie.entity";
import { Student } from "src/student/model/entities/student.entity";
import { User } from "src/user/model/entities/user.entity";
import {
  Connection,
  In,
  Repository,
  SelectQueryBuilder,
} from "typeorm";

@Injectable()
export class GroupingService {
  constructor(
    @InjectRepository(SchoolClass)
    private schoolClassRepository: Repository<SchoolClass>,

    @InjectRepository(School)
    private schoolRepository: Repository<School>,

    @InjectRepository(Serie)
    private seriesClassRepository: Repository<Serie>,

    @InjectRepository(County)
    private countyRepository: Repository<County>,

    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async handle(paginationParams: PaginationParams, user: User) {
    const { limit, page, serie, school, county, search, order, schoolClass, column } =
      paginationParams;

    const orderBy = order === "ASC" ? "ASC" : "DESC";

    if(schoolClass) {
      const queryBuilder = this.connection
        .getRepository(Student)
        .createQueryBuilder("Student")
        .select([
          "Student.ALU_ID",
          "Student.ALU_NOME",
          "Student.ALU_CPF",
          "Student.ALU_NOME_MAE",
          "Student.ALU_DT_NASC",
        ])
        .where("Student.ALU_TUR = :schoolClass", { schoolClass })
        .orderBy("Student.ALU_NOME", orderBy)
        .andWhere('Student.ALU_ATIVO = true');

        if (search) {
          queryBuilder.andWhere("Student.ALU_NOME LIKE :search", {
            search: `%${search}%`,
          });
        }

      const data = await this.paginationData(queryBuilder, +page, +limit);

      return data;
    } else if (serie) {
      const queryBuilder = this.schoolClassRepository
        .createQueryBuilder("TURMA")
        .select([
          "TURMA.TUR_ID",
          "TURMA.TUR_NOME",
          "TURMA.TUR_ANO",
          "TURMA.TUR_TIPO",
        ])
        .loadRelationCountAndMap(
          "TURMA.TOTAL_ENTURMADO",
          "TURMA.studentsAll",
          "students",
          (qb) =>
            qb
              .where("students.ALU_STATUS = 'Enturmado'")
              .andWhere("students.ALU_ATIVO = 1")
              .andWhere("students.ALU_ESC = :school", { school }),
        )
        .loadRelationCountAndMap(
          "TURMA.TOTAL_ALUNOS",
          "TURMA.studentsAll",
          "students",
          (qb) =>
            qb
              .where("students.ALU_ESC = :school", { school })
              .andWhere("students.ALU_ATIVO = 1"),
        )
        .orderBy("TURMA.TUR_NOME", orderBy)
        .where("TURMA.TUR_SER = :serie", { serie })
        .andWhere("TURMA.TUR_ESC = :school", { school })
        .andWhere("TURMA.TUR_ATIVO = 1");

      if (search) {
        const formatSearch = search.replace("°", "º");
        queryBuilder.andWhere("(TUR_NOME LIKE :search)", {
          search: `%${formatSearch}%`,
        });
      }
      const schoolClasses = await queryBuilder.getMany();
      const data = await this.paginationData(queryBuilder, +page, +limit);

      const reduce = schoolClasses.reduce(
        (acc, cur: any) => {
          return {
            totalGrouped: acc.totalGrouped + cur.TOTAL_ALUNOS,
          };
        },
        {
          totalGrouped: 0,
        },
      );

      
      const totalStudents = await this.connection.getRepository(Student).count({
        where: {
          ALU_ESC: {
            ESC_ID: school,
          },
          ALU_SER: {
            SER_ID: serie
          },
          ALU_ATIVO: true
        }
      })

      return {
        ...data,
        ...reduce,
        totalStudents
      };
    } else if (school) {
      const queryBuilder = this.seriesClassRepository
        .createQueryBuilder("SERIE")
        .select(["SERIE.SER_ID", "SERIE.SER_NOME"])
        .leftJoin("SERIE.SER_TUR", "SER_TUR")
        .leftJoin("SER_TUR.TUR_ESC", "TUR_ESC")
        .loadRelationCountAndMap(
          "SERIE.TOTAL_ENTURMADO",
          "SERIE.SER_ALU",
          "students",
          (qb) =>
            qb
              .where("students.ALU_ESC = :school", { school })
              .andWhere("students.ALU_ATIVO = 1")
              .andWhere("students.ALU_STATUS = 'Enturmado'")
              .andWhere('students.ALU_TUR IS NOT NULL'),
        )
        .loadRelationCountAndMap(
          "SERIE.TOTAL_ALUNOS",
          "SERIE.SER_ALU",
          "students",
          (qb) =>
            qb
              .where("students.ALU_ESC = :school", { school })
              .andWhere("students.ALU_ATIVO = 1"),
        )
        .where("SER_TUR.TUR_ESC = :school", { school })
        .andWhere("SERIE.SER_ATIVO = 1")
        .andWhere('SER_TUR.TUR_ATIVO = 1')
        .orderBy("SERIE.SER_NOME", orderBy);

      if (search) {
        const formatSearch = search.replace("°", "º");
        queryBuilder.andWhere("(SER_NOME LIKE :search)", {
          search: `%${formatSearch}%`,
        });
      }
      // const series = await queryBuilder.getMany();
      const data = await this.paginationData(queryBuilder, +page, +limit);

      const totalStudents = await this.connection.getRepository(Student).count({
        where: {
          ALU_ATIVO: true,
          ALU_ESC: {
            ESC_ID: school,
          },
        },
      });

      const totalGrouped = await this.connection
        .getRepository(Student)
        .count({
          where: {
            ALU_ATIVO: true,
            ALU_ESC: {
              ESC_ID: school,
            },
            ALU_STATUS: "Enturmado",
          },
        });

      return {
        ...data,
        totalStudents,
        totalGrouped,
      };
    } else if (county) {
      const queryBuilder = this.schoolRepository
        .createQueryBuilder("ESCOLA")
        .select(["ESCOLA.ESC_ID", "ESCOLA.ESC_NOME", "ESCOLA.ESC_INEP"])
        .orderBy("ESCOLA.ESC_NOME", orderBy)
        .where("ESCOLA.ESC_MUN = :county", { county })
        .andWhere("ESCOLA.ESC_ATIVO = 1")

      if (search) {
        const formatSearch = search.replace("°", "º");
        queryBuilder.andWhere(
          "(ESC_NOME LIKE :search OR ESC_INEP LIKE :search)",
          { search: `%${formatSearch}%` },
        );
      }

      if (user.USU_SPE.SPE_PER.PER_NOME === "Escola") {
        queryBuilder.andWhere("ESCOLA.ESC_ID = :school", { school: user?.USU_ESC?.ESC_ID });
      }

      const schools = await queryBuilder.getMany();

      const data = await this.paginationData(queryBuilder, +page, +limit);

      const formattedData = await Promise.all(
        data.items.map(async (school) => {
          const totalStudents = await this.connection
            .getRepository(Student)
            .count({
              where: {
                ALU_ATIVO: true,
                ALU_ESC: {
                  ESC_ID: school.ESC_ID,
                },
              },
            });

          const totalEnturmado = await this.connection
            .getRepository(Student)
            .count({
              where: {
                ALU_ATIVO: true,
                ALU_ESC: {
                  ESC_ID: school.ESC_ID,
                },
                ALU_STATUS: "Enturmado",
              },
            });

          const totalNaoEnturmado = await this.connection
            .getRepository(Student)
            .count({
              where: {
                ALU_ATIVO: true,
                ALU_ESC: {
                  ESC_ID: school.ESC_ID,
                },
                ALU_STATUS: "Não Enturmado",
              },
            });

          return {
            ...school,
            TOTAL_ALUNOS: totalStudents,
            TOTAL_ENTURMADO: totalEnturmado,
            TOTAL_NAO_ENTURMADO: totalNaoEnturmado,
          };
        }),
      );

      const totalStudents = await this.connection.getRepository(Student).count({
        where: {
          ALU_ATIVO: true,
          ALU_ESC: {
            ESC_ID: In(schools.map((school) => school.ESC_ID)),
          },
        },
      });

      const totalGrouped = await this.connection.getRepository(Student).count({
        where: {
          ALU_ATIVO: true,
          ALU_ESC: {
            ESC_ID: In(schools.map((school) => school.ESC_ID)),
          },
          ALU_STATUS: "Enturmado",
        },
      });

      return {
        ...data,
        items: formattedData,
        totalGrouped,
        totalStudents,
        totalNotGrouped: totalStudents - totalGrouped,
      };
    } else {
      const queryBuilder = this.countyRepository
        .createQueryBuilder("CIDADE")
        .leftJoinAndSelect("CIDADE.schools", "schools")
        .orderBy("CIDADE.MUN_NOME", orderBy);

      if (search) {
        const formatSearch = search.replace("°", "º");
        queryBuilder.andWhere("(MUN_NOME LIKE :search)", {
          search: `%${formatSearch}%`,
        });
      }
      const counties = await queryBuilder.getMany();

      const total = counties.length;
      const skippedItems = (+page - 1) * +limit;
      const totalPages = getLastPage(total, +limit);

      let totalGrouped = 0;
      let totalStudents = 0;
      let totalNotGrouped = 0;
      let totalSchools = 0;

      const formattedData = await Promise.all(
        counties.map(async (county) => {
          const students = await this.connection.getRepository(Student).find({
            select: ["ALU_ID", "ALU_STATUS"],
            where: {
              ALU_ATIVO: true,
              ALU_ESC: {
                ESC_ID: In(county.schools.map((school) => school.ESC_ID)),
              },
            },
          });

          const studentsGrouped = students.filter(
            (student) => student.ALU_STATUS === "Enturmado",
          ).length;

          totalGrouped += studentsGrouped;
          totalStudents += students.length;
          totalNotGrouped += students.length - studentsGrouped;
          return {
            ...county,
            TOTAL_ALUNOS: students.length,
            TOTAL_ENTURMADO: studentsGrouped,
            TOTAL_NAO_ENTURMADO: students.length - studentsGrouped,
            TOTAL_ESCOLAS: county.schools.length,
          };
        }),
      );

      let items = formattedData.filter(
        (item, index) => index >= skippedItems && index < skippedItems + +limit,
      );

      return {
        items: items,
        meta: {
          totalItems: total,
          itemCount: items.length,
          totalPages,
        },
        totalGrouped,
        totalStudents,
        totalSchools,
        totalNotGrouped,
      };
    }
  }

  private async paginationData<T>(
    queryBuilder: SelectQueryBuilder<T>,
    page: number,
    limit: number,
  ): Promise<Pagination<T>> {
    const totalItems = await queryBuilder.getCount();

    const data = await paginate(queryBuilder, {
      page: page,
      limit: limit,
      paginationType: PaginationTypeEnum.TAKE_AND_SKIP,
      countQueries: true,
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

    return data;
  }
}
