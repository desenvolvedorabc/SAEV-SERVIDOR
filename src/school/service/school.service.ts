import { ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import { Repository, Connection } from "typeorm";
import { School } from "../model/entities/school.entity";
import { ISchool } from "../model/interface/school.interface";
import { CreateSchoolDto } from "../model/dto/create-school.dto";
import { UpdateSchoolDto } from "../model/dto/update-school.dto";
import {
  paginate,
  Pagination,
  IPaginationOptions,
  PaginationTypeEnum,
} from "nestjs-typeorm-paginate";
import { editFileName } from "../../helpers/utils";
import { writeFileSync } from "fs";
import { User } from "src/user/model/entities/user.entity";
import { PaginationParams } from "src/helpers/params";
import { Assessment } from "src/assessment/model/entities/assessment.entity";
import { AssessmentsService } from "src/assessment/service/assessment.service";
import { Student } from "../../student/model/entities/student.entity";

@Injectable()
export class SchoolService {
  constructor(
    @InjectRepository(School)
    private schoolRepository: Repository<School>,
    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(Student)
    private studentRepository: Repository<Student>,

    @InjectRepository(Assessment)
    private assessmentsRepository: Repository<Assessment>,

    @InjectConnection()
    private readonly connection: Connection,

    private assesmentService: AssessmentsService,
  ) {}

  /**
   * Listagem de escolas com paginação, ordenação e pesquisa por nome
   * @param options adicionar o limite e qual página estamos
   * @param search permitir pesquisa por um termo pelo nome do escola
   * @param order cria a ordenação para a listagem
   * @returns
   */
  async paginate(
    options: IPaginationOptions,
    search: string,
    column: string,
    orderBy: string,
    status: string,
    countyId: number,
    user: User,
    active?: '0' | '1',
  ): Promise<Pagination<School>> {
    const queryBuilder = this.schoolRepository
      .createQueryBuilder("ESCOLA")
      .select(["ESCOLA", "ESC_MUN.MUN_ID"])
      .leftJoin("ESCOLA.ESC_MUN", "ESC_MUN");

    let strQuery = "";
    if (search) {
      search = search.replace("°", "º");
      strQuery = ` ESCOLA.ESC_NOME LIKE '%${search}%' `;
    }


    if (status) {
      strQuery = strQuery
        ? strQuery.concat(` AND ESCOLA.ESC_STATUS = '${status}' `)
        : ` ESCOLA.ESC_STATUS = '${status}' `;
    }

    if (user.USU_SPE.SPE_PER.PER_NOME === "SAEV") {
      if (strQuery) {
        strQuery += " AND ";
      }
      strQuery = ` ESC_MUN.MUN_ID = '${countyId}' `;
    }

    if (user.USU_SPE.SPE_PER.PER_NOME === "Município") {
      if (strQuery) {
        strQuery += " AND ";
      }
      strQuery = ` ESC_MUN.MUN_ID = '${user.USU_MUN.MUN_ID}' `;
    }

    const order: any = orderBy;
    queryBuilder.orderBy(column, order);
    queryBuilder.where(strQuery);

    if(active) {
      queryBuilder.andWhere('ESCOLA.ESC_ATIVO = :active', {active})
    }

    if (user.USU_SPE.SPE_PER.PER_NOME === "Escola") {
      queryBuilder.andWhere("ESCOLA.ESC_ID = :id", { id: user.USU_ESC.ESC_ID });
    }

    if (search) {
      const formattedSearch = search.replace("°", "º");
      queryBuilder.andWhere("ESCOLA.ESC_NOME like :search", {
        search: `%${formattedSearch}%`,
      });
    }

    return paginate<School>(queryBuilder, options);
  }

  async getSchoolsReport(paginationParams: PaginationParams) {
    const {
      search,
      county,
      order: orderBy,
      column,
      page,
      limit,
      status,
    } = paginationParams;

    const numberYear = new Date().getFullYear();

    const queryBuilder = this.schoolRepository
      .createQueryBuilder("ESCOLA")
      .select(["ESCOLA", "ESC_MUN.MUN_ID", 'ESC_ALU.ALU_ID'])
      .leftJoin("ESCOLA.ESC_ALU", "ESC_ALU")
      .leftJoinAndSelect(
        "ESC_ALU.SCHOOL_ABSENCES",
        "SCHOOL_ABSENCES",
        `SCHOOL_ABSENCES.IFR_ANO = ${numberYear}`,
      )
      .leftJoin("ESCOLA.ESC_MUN", "ESC_MUN");

    queryBuilder.where("ESC_MUN.MUN_ID = :county", { county });

    if (search) {
      const formattedSearch = search.replace("°", "º");
      queryBuilder.andWhere("ESCOLA.ESC_NOME like :search", {
        search: `%${formattedSearch}%`,
      });
    }

    if (status) {
      queryBuilder.andWhere("ESCOLA.ESC_STATUS = :status", { status });
    }
    const order: any = orderBy;
    queryBuilder.orderBy("ESCOLA.ESC_NOME", order);

    const totalItems = await queryBuilder.getCount();

    const data = await paginate(queryBuilder, {
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

    const formattedData = await Promise.all(
      data.items.map(async (school) => {
        const totalStudents = await this.connection
          .getRepository(Student)
          .count({
            where: {
              ALU_ESC: {
                ESC_ID: school.ESC_ID,
              },
              ALU_ATIVO: true,
            },
          });

        const totalEnturmado = await this.connection
          .getRepository(Student)
          .count({
            where: {
              ALU_ESC: {
                ESC_ID: school.ESC_ID,
              },
              ALU_STATUS: "Enturmado",
              ALU_ATIVO: true,
            },
          });

        const infrequencia = school?.ESC_ALU?.reduce((acc, student) => {
          if (student.SCHOOL_ABSENCES.length) {
            return acc + student.SCHOOL_ABSENCES[0].IFR_FALTA;
          } else {
            return acc;
          }
        }, 0);

        return {
          ESC_ID: school.ESC_ID,
          ESC_NOME: school.ESC_NOME,
          ESC_STATUS: school.ESC_STATUS,
          ESC_INEP: school.ESC_INEP,
          ESC_ATIVO: school.ESC_ATIVO,
          ENTURMADOS: totalEnturmado
            ? Math.round((totalEnturmado / totalStudents) * 100)
            : 0,
          INFREQUENCIA: 0,
        };
      }),
    );

    return {
      ...data,
      items: formattedData,
    };
  }

  /**
   * Criar escola
   * @param createSchoolDto objeto referente a criação de escola
   * @returns informa que o escola foi criado
   */
  add(createSchoolDto: CreateSchoolDto, user: User) {
    return this.schoolExists(
      createSchoolDto.ESC_NOME,
      createSchoolDto.ESC_UF,
      createSchoolDto.ESC_CIDADE,
    ).then((exists: boolean) => {
      if (!exists) {
        return this.schoolRepository
          .save(createSchoolDto, { data: user })
          .then((saved: ISchool) => {
            return saved;
          });
      } else {
        throw new HttpException("Escola já cadastrada.", HttpStatus.CONFLICT);
      }
    });
  }

  /**
   * Retorna todos os escolas
   * @returns retorna uma lista de escolas
   */
  async findAll(user: User): Promise<ISchool[]> {
    if (user.USU_SPE.SPE_PER.PER_NOME === "Escola") {
      return this.schoolRepository.find({
        where: { ESC_ID: user.USU_ESC.ESC_ID, ESC_ATIVO: true },
        order: { ESC_NOME: "ASC" },
        relations: ["ESC_MUN"],
      });
    }

    if (user.USU_SPE.SPE_PER.PER_NOME === "Município") {
      return this.schoolRepository.find({
        where: { ESC_MUN: { MUN_ID: user.USU_MUN.MUN_ID}, ESC_ATIVO: true },
        order: { ESC_NOME: "ASC" },
        relations: ["ESC_MUN"],
      });
    }

    return this.schoolRepository.find({
      order: { ESC_NOME: "ASC" },
      relations: ["ESC_MUN"],
      where: {
        ESC_ATIVO: true,
      }
    });
  }

  /**
   * Retorna todos os escolas para transferencia
   * @returns retorna uma lista de escolas
   */
  findAllTransfer(): Promise<ISchool[]> {
    return this.schoolRepository.find({
      order: { ESC_NOME: "ASC" },
      relations: ["ESC_MUN"],
    });
  }

  /**
   *
   * @param id informação referente a identificação do escola
   * @returns retorna o escola pesquisada
   */
  async findOneReport(ESC_ID: string) {
    const numberYear = new Date().getFullYear();

    const school = (await this.schoolRepository
      .createQueryBuilder("ESCOLA")
      .select(["ESCOLA"])
      // .leftJoin("ESCOLA.ESC_MUN", "ESC_MUN")
      // .leftJoinAndSelect("ESCOLA.ESC_ALU", "ESC_ALU")
      .leftJoinAndSelect("ESCOLA.ESC_TUR", "ESC_TUR")
      .leftJoinAndSelect("ESC_TUR.TUR_SER", "TUR_SER")
      // .leftJoinAndSelect(
      //   "ESC_ALU.SCHOOL_ABSENCES",
      //   "SCHOOL_ABSENCES",
      //   `SCHOOL_ABSENCES.IFR_ANO = ${numberYear}`,
      // )
      .where("ESCOLA.ESC_ID = :id", { id: ESC_ID })
      .getOne()) as any;

      if(!school) {
        throw new NotFoundException('Escola não encontrada')
      }


      const totalUsers = await this.connection
        .getRepository(User)
        .count({ where: { USU_ESC: { ESC_ID } } });

      const totalStudents = await this.connection.getRepository(Student).count({
        where: {
          ALU_ESC: {
            ESC_ID,
          },
          ALU_ATIVO: true,
        },
      });

      const totalEnturmados = await this.connection
        .getRepository(Student)
        .count({
          where: {
            ALU_ESC: {
              ESC_ID,
            },
            ALU_STATUS: "Enturmado",
            ALU_ATIVO: true,
          },
        });

    let totalTests = await this.assesmentService.getTests(ESC_ID);

    let series = school?.ESC_TUR?.map((data) => data?.TUR_SER?.SER_ID);

    series = series.filter(
      (value, index, self) => index === self.findIndex((t) => value === t),
    );
    // const infrequencia = school?.ESC_ALU?.reduce((acc, student) => {
    //   if (student.SCHOOL_ABSENCES.length) {
    //     return acc + student.SCHOOL_ABSENCES[0].IFR_FALTA;
    //   } else {
    //     return acc;
    //   }
    // }, 0);

    return {
      ESC_ID: school.ESC_ID,
      ESC_NOME: school.ESC_NOME,
      TOTAL_ENTURMADO: totalEnturmados,
      TOTAL_ALUNOS: totalStudents,
      TOTAL_USUARIOS: totalUsers,
      totalTests,
      ENTURMADOS: !!totalEnturmados ? Math.round(
        (totalEnturmados / totalStudents) * 100,
      ) : 0,
      SERIES: series?.length,
      INFREQUENCIA: 0,
      // INFREQUENCIA: infrequencia
      //   ? Math.round(infrequencia / totalStudents)
      //   : 0,
    };
  }

  async findOne(id: number): Promise<School> {
    const school = await this.schoolRepository.findOne({
      where: {
        ESC_ID: id
      }
    })

    if(!school) {
      throw new NotFoundException()
    }

    return school;
  }

  async disableUsersBySchool(idSchool: number): Promise<void> {
    const users = await this.userRepository.find({
      where: {
        USU_ESC: {
          ESC_ID: idSchool,
        },
      },
    });

    for (const user of users) {
      if (user.USU_ATIVO) {
        await this.userRepository.save({
          ...user,
          USU_ATIVO: false,
        });
      }
    }
  }

  async uncrowdStudentsBySchool(idSchool: number): Promise<void> {
    const students = await this.studentRepository.find({
      where: {
        ALU_ESC: {
          ESC_ID: idSchool,
        },
      },
    });

    for (const student of students) {
      await this.studentRepository.save({
        ...student,
        ALU_ESC: null,
        ALU_TUR: null,
        ALU_SER: null,
        ALU_STATUS: "Não Enturmado",
      });
    }
  }

  async findByTransfer({page, limit, active, search}: PaginationParams, user: User) {
    const queryBuilder = this.schoolRepository.createQueryBuilder('School').select(['School.ESC_ID', 'School.ESC_NOME'])
  
    if (user.USU_SPE.SPE_PER.PER_NOME !== "SAEV") {
      queryBuilder.andWhere('School.ESC_MUN = :county', {county: user?.USU_MUN?.MUN_ID})
    }

    if(active) {
      queryBuilder.andWhere('School.ESC_ATIVO = :active', {active})
    }

    if(search?.trim()) {
      const formattedSearch = search.replace("°", "º");
      queryBuilder.andWhere("School.ESC_NOME like :search", {
        search: `%${formattedSearch}%`,
      });
    }

    const totalItems = await queryBuilder.getCount();

    const data = await paginate(queryBuilder, {
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

    return data
  }

  /**
   *
   * @param id informação referente a identificação do município dentro da escola
   * @returns retorna o escola pesquisada
   */
  async findByCounty(USER_ID: string, MUN_ID: string) {
    // Verificar perfil
    const queryBuilderUSER = await this.userRepository
      .createQueryBuilder("USUARIO")
      .select(["PERFIL_BASE.PER_NOME AS PERFIL, USUARIO.* "])
      .leftJoin("USUARIO.USU_SPE", "USU_SPE")
      .leftJoin(
        "perfil_base",
        "PERFIL_BASE",
        "PERFIL_BASE.PER_ID = USU_SPE.SPE_PER_ID",
      )
      .where("USUARIO.USU_ID = :userId", { userId: USER_ID })
      .execute();

    if (queryBuilderUSER[0].PERFIL === "Município") {
      return this.schoolRepository.find({
        where: { ESC_MUN: { MUN_ID: queryBuilderUSER[0].USU_MUN_ID }, ESC_ATIVO: true },
        order: { ESC_NOME: "ASC" },
        relations: ["ESC_MUN"],
      });
    }

    if (queryBuilderUSER[0].PERFIL === "Escola") {
      return this.schoolRepository.find({
        where: { ESC_ID: queryBuilderUSER[0].USU_ESC_ID },
        order: { ESC_NOME: "ASC" },
        relations: ["ESC_MUN"],
      });
    }

    return this.schoolRepository.find({
      order: { ESC_NOME: "ASC" },
      relations: ["ESC_MUN"],
      where: { ESC_MUN: { MUN_ID: MUN_ID }, ESC_ATIVO: true },
    });
  }

  /**
   *
   * @param id informação referente a identificação do escola
   * @param updateSchoolDto objeto referente a criação de escola
   * @returns informa que o escola foi atualizada
   */
  async update(
    ESC_ID: number,
    updateSchoolDto: UpdateSchoolDto,
    user: User,
  ): Promise<ISchool> {
    const school = await this.schoolRepository.findOne({
      where: {
        ESC_ID
      }
    })

    if(!school) {
      throw new NotFoundException('Escola não encontrada')
    }

    if(school.ESC_ATIVO !== updateSchoolDto?.ESC_ATIVO && user?.USU_SPE?.SPE_PER?.PER_NOME === "Escola") {
      throw new ForbiddenException('Você não tem permissão para executar esta ação.')
    }

    const schoolUpdate = await this.schoolRepository.save(
      { ...updateSchoolDto, ESC_ID },
      { data: user },
    );

    if (!updateSchoolDto.ESC_ATIVO) {
      this.disableUsersBySchool(ESC_ID);

      //validar regra sobre o municipio
      // this.uncrowdStudentsBySchool(ESC_ID);
    }

    return schoolUpdate;
  }

  /**
   *
   * @param id informação referente a identificação do escola
   * @param filename nome do arquivo salvo
   * @returns informa que o escola foi atualizada
   */
  async updateAvatar(
    ESC_ID: number,
    filename: string,
    base64: string,
    user: User,
  ): Promise<string> {
    let school = await this.schoolRepository.findOne({ ESC_ID: ESC_ID });
    const folderName = "./public/school/avatar/";
    const newFileName = editFileName(filename);
    if (school) {
      school.ESC_LOGO = newFileName;
      writeFileSync(`${folderName}${newFileName}`, base64, {
        encoding: "base64",
      });
      await this.update(ESC_ID, school, user);
      return newFileName;
    } else {
      throw new HttpException(
        "Não é possível gravar esta imagem.",
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Verificação se já existe o mesmo escola, com mesmo estado e cidade
   * @param ESC_NOME nome do escola
   * @param ESC_UF estado do escola
   * @param ESC_CIDADE cidade do escola
   * @returns retorna o resultado da consulta como VERDADEIRO ou FALSO
   */
  async schoolExists(
    ESC_NOME: string,
    ESC_UF: string,
    ESC_CIDADE: string,
  ): Promise<boolean> {
    const user = await this.schoolRepository.findOne({
      ESC_NOME,
      ESC_UF,
      ESC_CIDADE,
    });
    if (user) {
      return true;
    } else {
      return false;
    }
  }
}
