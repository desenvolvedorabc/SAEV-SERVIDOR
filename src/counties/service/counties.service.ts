import { ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import { Connection, In, Repository } from "typeorm";
import { County } from "../model/entities/county.entity";
import { ICounty } from "../model/interface/county.interface";
import { CreateCountyDto } from "../model/dto/create-county.dto";
import { UpdateCountyDto } from "../model/dto/update-county.dto";
import {
  paginate,
  Pagination,
  IPaginationOptions,
  PaginationTypeEnum,
} from "nestjs-typeorm-paginate";
import { writeFileSync } from "fs";
import { editFileName } from "../../helpers/utils";
import { User } from "src/user/model/entities/user.entity";
import { PaginationParams } from "src/helpers/params";
import { Assessment } from "src/assessment/model/entities/assessment.entity";
import { AssessmentsService } from "src/assessment/service/assessment.service";
import { Student } from "../../student/model/entities/student.entity";
import { Teacher } from "../../teacher/model/entities/teacher.entity";

@Injectable()
export class CountiesService {
  constructor(
    @InjectRepository(County)
    private countyRepository: Repository<County>,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(Assessment)
    private assessmentsRepository: Repository<Assessment>,

    @InjectConnection()
    private readonly connection: Connection,

    private assesmentService: AssessmentsService,
  ) {}

  /**
   * Listagem de municípios com paginação, ordenação e pesquisa por nome.
   *
   * @param options adicionar o limite e qual página estamos
   * @param search permitir pesquisa por um termo pelo nome do município
   * @param order cria a ordenação para a listagem
   * @returns Retorna a lista paginada, ordenada e filtrada com os municípios
   */
  async paginate(
    options: IPaginationOptions,
    search: string,
    column: string,
    orderBY: string,
    status: string,
    user: User,
    active: "0" | "1",
  ): Promise<Pagination<County>> {
    const queryBuilder = this.countyRepository.createQueryBuilder();
    if (search) {
      queryBuilder.where("MUN_NOME LIKE :q", { q: `%${search}%` });
    }
    if (status) {
      queryBuilder.where("MUN_STATUS = :q", { q: `${status}` });
    }
    queryBuilder.orderBy(
      column || "MUN_NOME",
      orderBY.toUpperCase() === "ASC" ? "ASC" : "DESC",
    );

    if (active) {
      queryBuilder.andWhere("MUN_ATIVO = :active", { active });
    }

    if (user.USU_SPE.SPE_PER.PER_NOME !== "SAEV") {
      queryBuilder.andWhere("MUN_ID = :id", { id: user.USU_MUN.MUN_ID });
    }

    return paginate<County>(queryBuilder, options);
  }

  async getCountiesReport(paginateParams: PaginationParams) {
    const { search, column, limit, page, order, status } = paginateParams;

    const queryBuilder = this.countyRepository
      .createQueryBuilder("CIDADE")
      .select([
        "CIDADE.MUN_ID",
        "CIDADE.MUN_COD_IBGE",
        "CIDADE.MUN_STATUS",
        "CIDADE.MUN_NOME",
        "schools.ESC_ID",
      ])
      .leftJoin("CIDADE.schools", "schools");

    if (search) {
      queryBuilder.andWhere("CIDADE.MUN_NOME LIKE :q", { q: `%${search}%` });
    }

    if (status) {
      queryBuilder.andWhere("CIDADE.MUN_STATUS = :status", { status });
    }

    if (column === "MUN_NOME") {
      queryBuilder.orderBy(
        "CIDADE.MUN_NOME",
        order?.toUpperCase() === "ASC" ? "ASC" : "DESC",
      );
    }

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

    const calcStudentsByMun = await Promise.all(
      data.items.map(async (data) => {
        const totalStudents = await this.connection
          .getRepository(Student)
          .count({
            where: {
              ALU_ESC: {
                ESC_ID: In(data.schools.map((school) => school.ESC_ID)),
              },
              ALU_ATIVO: true,
            },
          });

        const totalEnturmado = await this.connection
          .getRepository(Student)
          .count({
            where: {
              ALU_ESC: {
                ESC_ID: In(data.schools.map((school) => school.ESC_ID)),
              },
              ALU_STATUS: "Enturmado",
              ALU_ATIVO: true,
            },
          });

        return {
          MUN_ID: data.MUN_ID,
          MUN_COD_IBGE: data.MUN_COD_IBGE,
          MUN_STATUS: data.MUN_STATUS,
          MUN_NOME: data.MUN_NOME,
          TOTAL_ESCOLAS: data.schools.length,
          TOTAL_ALUNOS: !!totalStudents ? totalStudents : 0,
          ENTURMADOS: !!totalEnturmado
            ? Math.round((totalEnturmado / totalStudents) * 100)
            : 0,
        };
      }),
    );

    return {
      ...data,
      items: calcStudentsByMun,
    };
  }

  /**
   * Criar município
   *
   * @param createCountyDto objeto referente a criação de município
   * @returns informa que o município foi criado
   */
  add(createCountyDto: CreateCountyDto, user: User) {
    return this.countyExists(
      createCountyDto.MUN_NOME,
      createCountyDto.MUN_UF,
      createCountyDto.MUN_CIDADE,
    ).then((exists: boolean) => {
      if (!exists) {
        return this.countyRepository
          .save(createCountyDto, {
            data: user,
          })
          .then((saved: ICounty) => {
            return saved;
          });
      } else {
        throw new HttpException(
          "Município já cadastrado.",
          HttpStatus.CONFLICT,
        );
      }
    });
  }

  /**
   * Retorna todos os municípios
   *
   * @returns retorna uma lista de municípios
   */
  async findAll(userId: string): Promise<ICounty[]> {
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
      .where("USUARIO.USU_ID = :userId", { userId })
      .execute();

    if (
      queryBuilderUSER[0].PERFIL === "Município" ||
      queryBuilderUSER[0].PERFIL === "Escola"
    ) {
      return this.countyRepository.find({
        where: { MUN_ID: queryBuilderUSER[0].USU_MUN_ID },
        order: { MUN_NOME: "ASC" },
      });
    }

    return this.countyRepository.find({
      order: { MUN_NOME: "ASC" },
      where: { MUN_ATIVO: true },
    });
  }

  /**
   * Buscar um município com base no id
   * @param id informação referente a identificação do município
   * @returns retorna o município pesquisado
   */
  async findOneReport(MUN_ID: number) {
    const numberYear = new Date().getFullYear();

    const { schools, ...county } = await this.countyRepository
      .createQueryBuilder("CIDADE")
      .select(['CIDADE', 'schools.ESC_ID'])
      // .select(['CIDADE', 'schools.ESC_ID', 'ESC_ALU.ALU_ID'])
      .leftJoin("CIDADE.schools", "schools")
      // .leftJoin("schools.ESC_ALU", "ESC_ALU")
      // .leftJoinAndSelect(
      //   "ESC_ALU.SCHOOL_ABSENCES",
      //   "SCHOOL_ABSENCES",
      //   `SCHOOL_ABSENCES.IFR_ANO = ${numberYear}`,
      // )
      .where("CIDADE.MUN_ID = :id", { id: MUN_ID })
      .getOne();

      if(!county) {
        throw new NotFoundException('Município não encontrado')
      }

    const totalTeachers = await this.connection
      .getRepository(Teacher)
      .count({ where: { PRO_MUN: { MUN_ID: county.MUN_ID } } });

    const totalUsers = await this.connection
      .getRepository(User)
      .count({ where: { USU_MUN: { MUN_ID: county.MUN_ID } } });

    const totalStudents = await this.connection.getRepository(Student).count({
      where: {
        ALU_ESC: {
          ESC_ID: In(schools.map((school) => school.ESC_ID)),
        },
        ALU_ATIVO: true,
      },
    });

    const totalEnturmados = await this.connection.getRepository(Student).count({
      where: {
        ALU_ESC: {
          ESC_ID: In(schools.map((school) => school.ESC_ID)),
        },
        ALU_STATUS: "Enturmado",
        ALU_ATIVO: true,
      },
    });

    let totalTests = await this.assesmentService.getTests(null, MUN_ID);

    // const { infrequencia } = this.calcTotalStudentByCounty({
    //   ...county,
    //   schools,
    // });


    return {
      ...county,
      TOTAL_PROFESSORES: totalTeachers,
      TOTAL_USUARIOS: totalUsers,
      TOTAL_ALUNOS: totalStudents,
      TOTAL_ESCOLAS: schools.length,
      totalTests,
      ENTURMADOS: totalEnturmados
        ? Math.round((totalEnturmados / totalStudents) * 100)
        : 0,
        INFREQUENCIA: 0,
      // INFREQUENCIA: !!infrequencia ? Math.round(infrequencia / totalStudents) : 0,
    };
  }

  async findOne(id: number): Promise<County> {
    const county = await this.countyRepository.findOne({
      where: {
        MUN_ID: id
      }
    })

    if(!county) {
      throw new NotFoundException()
    }

    return county;
  }

  /**
   *
   * @param id informação referente a identificação do município
   * @param updateCountyDto objeto referente a criação de município
   * @returns informa que o município foi atualizado
   */
  async update(
    MUN_ID: number,
    updateCountyDto: UpdateCountyDto,
    user: User,
  ): Promise<ICounty> {
    const oldCounty = await this.countyRepository.findOne(MUN_ID);
    if(oldCounty?.MUN_ATIVO !== updateCountyDto?.MUN_ATIVO && user?.USU_SPE?.SPE_PER?.PER_NOME !== "SAEV") {
      throw new ForbiddenException('Você não tem permissão para executar esta ação.')
    }

    Object.keys(updateCountyDto).forEach((key) => {
      oldCounty[key] = updateCountyDto[key];
    });

    let county = null;
    if (!oldCounty) {
      county = await this.countyRepository.save(
        { ...updateCountyDto, MUN_ID },
        { data: user },
      );
    } else {
      county = await this.countyRepository.save(oldCounty, { data: user });
    }

    if (!updateCountyDto.MUN_ATIVO) {
      this.disableUsersByCounty(MUN_ID);
    }

    return county;
  }

  async disableUsersByCounty(idCounty: number): Promise<void> {
    const users = await this.userRepository.find({
      where: {
        USU_MUN: {
          MUN_ID: idCounty,
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

  /**
   *
   * @param id informação referente a identificação do município
   * @param filename nome do arquivo salvo
   * @returns informa que o município foi atualizado
   */
  async updateFile(
    MUN_ID: number,
    filename: string,
    base64: string,
    user: User,
  ): Promise<string> {
    let county = await this.countyRepository.findOne({ MUN_ID: MUN_ID });
    const folderName = "./public/county/file/";
    const newFileName = editFileName(filename);
    if (county) {
      county.MUN_ARQ_CONVENIO = newFileName;
      writeFileSync(`${folderName}${newFileName}`, base64, {
        encoding: "base64",
      });
      await this.update(MUN_ID, county, user);
      return newFileName;
    } else {
      throw new HttpException(
        "Não é possível gravar esta imagem.",
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   *
   * @param id informação referente a identificação do município
   * @param filename nome do arquivo salvo
   * @returns informa que o município foi atualizado
   */
  async updateAvatar(
    MUN_ID: number,
    filename: string,
    base64: string,
    user: User,
  ): Promise<string> {
    let county = await this.countyRepository.findOne({ MUN_ID: MUN_ID });
    const folderName = "./public/county/avatar/";
    const newFileName = editFileName(filename);
    if (county) {
      county.MUN_LOGO = newFileName;
      writeFileSync(`${folderName}${newFileName}`, base64, {
        encoding: "base64",
      });
      await this.update(MUN_ID, county, user);
      return newFileName;
    } else {
      throw new HttpException(
        "Não é possível gravar esta imagem.",
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Verificação se já existe o mesmo município, com mesmo estado e cidade
   * @param MUN_NOME nome do município
   * @param MUN_UF estado do município
   * @param MUN_CIDADE cidade do município
   * @returns retorna o resultado da consulta como VERDADEIRO ou FALSO
   */
  async countyExists(
    MUN_NOME: string,
    MUN_UF: string,
    MUN_CIDADE: string,
  ): Promise<boolean> {
    const county = await this.countyRepository.findOne({
      MUN_NOME,
      MUN_UF,
      MUN_CIDADE,
    });
    if (county) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Retorna todos os teste por ano
   *
   * @returns retorna uma lista de teste
   */
  findDistrict(uf: string, user: User): Promise<County[]> {
    if (user.USU_SPE.SPE_PER.PER_NOME !== "SAEV") {
      return this.countyRepository.find({
        order: { MUN_UF: "ASC" },
        where: { MUN_UF: uf, MUN_ID: user?.USU_MUN?.MUN_ID },
      });
    }

    return this.countyRepository.find({
      order: { MUN_UF: "ASC" },
      where: { MUN_UF: uf },
    });
  }

  /**
   * Retorna todos os anos dos testes
   *
   * @returns retorna uma lista de teste
   */
  findAllDistrict(): Promise<County[]> {
    const queryBuilder = this.countyRepository
      .createQueryBuilder()
      .select("MUN_UF")
      .orderBy("MUN_UF", "ASC");
    return queryBuilder.execute();
  }

  private calcTotalStudentByCounty(county: County): {
    infrequencia: number;
  } {
    const totalStudents = county.schools.reduce(
      (acc, school) => {
        const infrequencia = school.ESC_ALU.reduce((acc, student) => {
          if (student.SCHOOL_ABSENCES.length) {
            return acc + student.SCHOOL_ABSENCES[0].IFR_FALTA;
          } else {
            return acc;
          }
        }, 0);

        return {
          infrequencia: acc.infrequencia + infrequencia,
        };
      },
      {
        infrequencia: 0,
      },
    );

    return totalStudents;
  }
}
