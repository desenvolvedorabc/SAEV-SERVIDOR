import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import { Connection, Repository } from "typeorm";
import {
  Pagination,
  IPaginationOptions,
  paginateRaw,
} from "nestjs-typeorm-paginate";
import { Student } from "src/student/model/entities/student.entity";
import { CreateSchoolAbsencesDto } from "../model/dto/create-school-absences.dto";
import { SchoolAbsence } from "../model/entities/school-absences.entity";
import { User } from "src/user/model/entities/user.entity";
import { PaginationParams } from "src/helpers/params";
import { paginateData } from "src/utils/paginate-data";
import { County } from "src/counties/model/entities/county.entity";
import { School } from "src/school/model/entities/school.entity";
import { Serie } from "src/serie/model/entities/serie.entity";
import { SchoolClass } from "src/school-class/model/entities/school-class.entity";
import { StudentService } from "src/student/service/student.service";
import { Parser } from "json2csv";
import { InternalServerError } from "src/utils/errors";
import { namesForMonths } from "src/utils/months-name";

const namesInBROfTheLevel = {
  year: 'Ano',
  county: 'Município',
  school: 'Escola',
  serie: 'Serie',
  schoolClass: 'Turma',
  student: 'Aluno'
}

@Injectable()
export class SchoolAbsencesService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(SchoolAbsence)
    private schoolAbsencesRepository: Repository<SchoolAbsence>,

    private readonly studentsService: StudentService,

    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  /**
   * Salvar uma lista de infrequências
   * @param createSchoolAbsencesDto
   */
  async save(createSchoolAbsencesDto: CreateSchoolAbsencesDto[], user: User) {
    const listSchoolAbsencesDto = JSON.parse(
      JSON.stringify(createSchoolAbsencesDto[0]),
    );
    await Promise.all(
      listSchoolAbsencesDto.map(
        async (schoolAbsencesDto: CreateSchoolAbsencesDto) => {
          const idStudent = JSON.parse(
            JSON.stringify(schoolAbsencesDto["IFR_ALU_ID"]),
          );
          const month = JSON.parse(
            JSON.stringify(schoolAbsencesDto["IFR_MES"]),
          );
          const schoolAbsencesExisting = await this.findSchoolAbsencesExisting(
            idStudent,
            +month.MES_ID,
            +schoolAbsencesDto.IFR_ANO,
          );
          const studentExisting = await this.studentRepository.findOne(
            idStudent,
          );
          schoolAbsencesDto["IFR_ALU"] = studentExisting;
          schoolAbsencesDto["IFR_MES"] = month.MES_ID;

          if (schoolAbsencesExisting) {
            const { IFR_ID } = schoolAbsencesExisting;

            return this.schoolAbsencesRepository
              .save({ ...schoolAbsencesDto, IFR_ID }, { data: user })
              .then(() => {
                return schoolAbsencesDto;
              });
          }
          this.schoolAbsencesRepository
            .save(schoolAbsencesDto, { data: user })
            .then(() => {
              return schoolAbsencesDto;
            });
        },
      ),
    );
  }

  async findSchoolAbsencesExisting(
    idStudent: string,
    month: number,
    year: number,
  ) {
    return this.schoolAbsencesRepository
      .createQueryBuilder("INFREQUENCIA")
      .select(["INFREQUENCIA.IFR_ID"])
      .where(
        "INFREQUENCIA.IFR_ALU_ID = :idStudent AND INFREQUENCIA.IFR_MES = :month AND INFREQUENCIA.IFR_ANO = :year",
        { idStudent, month, year },
      )
      .getOne();
  }

  /**
   * Salvar uma lista de infrequências
   * @param createSchoolAbsencesDto
   */
  async delete(createSchoolAbsencesDto: CreateSchoolAbsencesDto[]) {
    await Promise.all(
      createSchoolAbsencesDto.map(
        async (schoolAbsencesDto: CreateSchoolAbsencesDto) => {
          const idStudent = JSON.parse(
            JSON.stringify(schoolAbsencesDto["IFR_ALU_ID"]),
          );
          this.deleteSchoolAbsences(
            idStudent,
            +schoolAbsencesDto.IFR_MES,
            +schoolAbsencesDto.IFR_ANO,
          );
        },
      ),
    );
  }

  deleteSchoolAbsences(idStudent: string, month: number, year: number) {
    return this.schoolAbsencesRepository
      .createQueryBuilder("INFREQUENCIA")
      .where(
        "INFREQUENCIA.IFR_ALU_ID = :idStudent AND INFREQUENCIA.IFR_MES = :month AND INFREQUENCIA.IFR_ANO = :year",
        { idStudent, month, year },
      )
      .delete()
      .execute();
  }

  /**
   * Listagem de infrequências com paginação, ordenação e pesquisa por nome.
   *
   * @param options adicionar o limite e qual página estamos
   * @param search permitir pesquisa por um termo pelo nome do infrequência
   * @param column coluna usada na ordenação
   * @param orderBY cria a ordenação para a listagem
   * @param schoolClassId busca somente a turma
   * @param month busca somente o mês
   * @param year busca somente o ano
   * @returns Retorna a lista paginada, ordenada e filtrada com os infrequências
   */
  async paginate(
    options: IPaginationOptions,
    search: string,
    column: string,
    orderBy: string,
    schoolClassId: number,
    month: number,
    year: string,
  ): Promise<Pagination<any>> {
    const queryBuilder = this.studentRepository
      .createQueryBuilder("ALUNO")
      .select([
        "ALUNO.ALU_ID AS ALU_ID",
        "ALUNO.ALU_NOME AS ALU_NOME",
        "ALUNO.ALU_INEP AS ALU_INEP",
        "INFREQUENCIA.IFR_MES",
        "INFREQUENCIA.IFR_ANO",
        "INFREQUENCIA.IFR_FALTA",
      ])
      .leftJoin(
        "infrequencia",
        "INFREQUENCIA",
        "INFREQUENCIA.IFR_ALU_ID = ALUNO.ALU_ID AND INFREQUENCIA.IFR_MES = :month AND INFREQUENCIA.IFR_ANO = :year",
        { month, year },
      );

    const order: any = orderBy;

    switch (column) {
      case "ALU_INEP":
        queryBuilder.orderBy("ALU_INEP", order);
        break;
      case "ALU_ID":
        queryBuilder.orderBy("ALU_ID", order);
        break;
      default:
        queryBuilder.orderBy("ALU_NOME", order);
        break;
    }

    queryBuilder.andWhere("ALUNO.ALU_TUR_ID = :schoolClass", {
      schoolClass: schoolClassId,
    });

    if (search) {
      search = search.replace("°", "º");
      queryBuilder.andWhere(
        "(ALU_NOME LIKE :search OR ALU_INEP LIKE :search OR ALU_ID LIKE :search)",
        { search: `%${search}%` },
      );
    }

    return paginateRaw<Student>(queryBuilder, options);
  }

  async report(dto: PaginationParams, user: User) {
    const { data, level } = await this.getData(dto, user);

    const optionsFilter = {
      county: ["MUN_ID", "MUN_NOME"],
      school: ["ESC_ID", "ESC_NOME"],
      serie: ["SER_ID", "SER_NOME"],
      schoolClass: ["TUR_ID", "TUR_NOME"],
      student: ["ALU_ID", "ALU_NOME"],
    };

    const { graph } = await this.getGraphAndTotalInfrequencyForMonths(
      dto,
      user,
    );

    const formattedData = await Promise.all(
      data.items.map(async (item) => {
        const { graph: graphAndTotal } =
          await this.getGraphAndTotalInfrequencyForMonths(
            {
              ...dto,
              [level]: item[optionsFilter[level][0]],
            },
            user,
          );

        return {
          id: item[optionsFilter[level][0]],
          name: item[optionsFilter[level][1]],
          graph: graphAndTotal,
        };
      }),
    );

    return {
      graph,
      data: {
        ...data,
        items: formattedData,
      },
    };
  }

  async generateCsvOfReport(dto: PaginationParams, user: User) {
    const { data, level } = await this.getData(dto, user, true);

    const optionsFilter = {
      county: ["MUN_ID", "MUN_NOME"],
      school: ["ESC_ID", "ESC_NOME"],
      serie: ["SER_ID", "SER_NOME"],
      schoolClass: ["TUR_ID", "TUR_NOME"],
      student: ["ALU_ID", "ALU_NOME"],
    };

    const formattedData = await Promise.all(
      data.items.map(async (item) => {
        const { graph } =
          await this.getGraphAndTotalInfrequencyForMonths(
            {
              ...dto,
              [level]: item[optionsFilter[level][0]],
            },
            user,
          );

        const formattedMonths = graph.months.reduce((acc, item) => {
          acc[namesForMonths[item.month]] = item.total;

          return acc
        }, {})

        return {
          nivel: namesInBROfTheLevel[level],
          ano: dto.year,
          id: item[optionsFilter[level][0]],
          nome: item[optionsFilter[level][1]],
          total_faltas: graph.total_infrequency,
          total_enturmados: level === 'student' ? 'N/A' : graph.total_grouped,

          ...formattedMonths,
        };
      }),
    );

    const parser = new Parser({
      quote: " ",
      withBOM: true,
      delimiter: ";"
    });

   
    try {
      const csv = parser.parse(formattedData);
      return csv;
    } catch (error) {
      throw new InternalServerError()
    }
  }

  private async getGraphAndTotalInfrequencyForMonths(
    dto: PaginationParams,
    user: User,
  ) {
    const numbersOfMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    let total_grouped = 0;

    if (!dto.student) {
      const { totalGrouped } =
        await this.studentsService.getTotalStudentsGrouped(dto, user);

      total_grouped = totalGrouped;
    }

    let total = 0;

    const months = await Promise.all(
      numbersOfMonths.map(async (month) => {
        const { total: totalForMonth } =
          await this.getTotalInfrequencyForReport({ ...dto, month });

        total += totalForMonth;

        return {
          month,
          total: totalForMonth,
        };
      }),
    );

    const graph = {
      months,
      total_infrequency: total,
      total_grouped,
    };

    return {
      graph,
    };
  }

  private async getTotalInfrequencyForReport({
    year,
    county,
    school,
    serie,
    month,
    schoolClass,
    student,
  }: PaginationParams) {
    const queryBuilder = this.schoolAbsencesRepository
      .createQueryBuilder("SchoolAbsences")
      .select('SUM(SchoolAbsences.IFR_FALTA) as totalInfrequency')
      .innerJoin("SchoolAbsences.IFR_SCHOOL_CLASS", "IFR_SCHOOL_CLASS")
      .where("SchoolAbsences.IFR_ANO = :year", { year });

    if (month) {
      queryBuilder.andWhere("SchoolAbsences.IFR_MES = :month", { month });
    }

    if (county) {
      queryBuilder.andWhere("IFR_SCHOOL_CLASS.TUR_MUN = :county", { county });
    }

    if (school) {
      queryBuilder.andWhere("IFR_SCHOOL_CLASS.TUR_ESC = :school", { school });
    }

    if (serie) {
      queryBuilder.andWhere("IFR_SCHOOL_CLASS.TUR_SER = :serie", { serie });
    }

    if (schoolClass) {
      queryBuilder.andWhere("IFR_SCHOOL_CLASS.TUR_ID = :schoolClass", {
        schoolClass,
      });
    }

    if (student) {
      queryBuilder.andWhere("SchoolAbsences.IFR_ALU = :student", {
        student,
      });
    }

    const {totalInfrequency} = await queryBuilder.getRawOne();

    return {
      total: +totalInfrequency ?? 0,
    };
  }

  private async getData(
    paginationParams: PaginationParams,
    user: User,
    isCsv = false,
  ) {
    const { limit, page, year, serie, school, county, schoolClass } =
      paginationParams;

    let queryBuilder;
    let level = "year";

    if (schoolClass) {
      const data = await this.studentsService.getStudentsGroupedBySchoolClass(paginationParams, isCsv);
      return { data, level: 'student' };
    } else if (serie) {
      level = "schoolClass";

      queryBuilder = this.connection
        .getRepository(SchoolClass)
        .createQueryBuilder("SchoolClass")
        .select(["SchoolClass.TUR_ID", "SchoolClass.TUR_NOME"])
        .orderBy("SchoolClass.TUR_NOME", "ASC")
        .where("SchoolClass.TUR_SER = :serie", { serie })
        .andWhere("SchoolClass.TUR_ESC = :school", { school })
        .andWhere("SchoolClass.TUR_ANO = :year", {year}); 
    } else if (school) {
      level = "serie";
      queryBuilder = this.connection
        .getRepository(Serie)
        .createQueryBuilder("Series")
        .select(["Series.SER_ID", "Series.SER_NOME"])
        .andWhere("Series.SER_ATIVO = 1")
        .orderBy("Series.SER_NOME", "ASC");
    } else if (county) {
      level = "school";
      queryBuilder = this.connection
        .getRepository(School)
        .createQueryBuilder("Schools")
        .select(["Schools.ESC_ID", "Schools.ESC_NOME"])
        .orderBy("Schools.ESC_NOME", "ASC")
        .where("Schools.ESC_MUN = :county", { county })
        .andWhere("Schools.ESC_ATIVO = 1");

      if (user?.USU_SPE?.SPE_PER?.PER_NOME === "Escola") {
        queryBuilder.andWhere("Schools.ESC_ID = :school", {
          school: user?.USU_ESC?.ESC_ID,
        });
      }

    } else if (year) {
      level = "county";
      queryBuilder = this.connection
        .getRepository(County)
        .createQueryBuilder("County")
        .select(["County.MUN_ID", "County.MUN_NOME"])
        .orderBy("County.MUN_NOME", "ASC");

      if (user?.USU_SPE?.SPE_PER?.PER_NOME !== "SAEV") {
        queryBuilder.andWhere("County.MUN_ID = :id", { id: user.USU_MUN.MUN_ID });
      }
    }

    if (queryBuilder) {
      const data = await paginateData(page, limit, queryBuilder, isCsv);

      return { data, level };
    }

    return {
      data: {
        items: [],
      },
      level: "year",
    };
  }
}
