import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { isPast } from "date-fns";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import { Connection, Repository } from "typeorm";
import { Student } from "../model/entities/student.entity";
import { IStudent } from "../model/interface/student.interface";
import { CreateStudentDto } from "../model/dto/create-student.dto";
import { UpdateStudentDto } from "../model/dto/update-student.dto";
import {
  Pagination,
  IPaginationOptions,
  paginateRaw,
  PaginationTypeEnum,
  paginate,
} from "nestjs-typeorm-paginate";
import { editFileName } from "../../helpers/utils";
import { writeFileSync } from "fs";
import { Pcd } from "src/shared/model/entities/pcd.entity";
import { GroupStudentDto } from "../model/dto/group-student.dto";
import { Assessment } from "src/assessment/model/entities/assessment.entity";
import { PaginationParams } from "src/helpers/params";
import { User } from "src/user/model/entities/user.entity";
import { SchoolClassService } from "src/school-class/service/school-class.service";
import { getRandomNumber } from "src/utils/generated-number";
import { StudentTestAnswer } from "src/release-results/model/entities/student-test-answer.entity";
import { SchoolClassStudent } from "src/school-class/model/entities/school-class-student.entity";
import { StudentTest } from "src/release-results/model/entities/student-test.entity";

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Pcd)
    private pcdRepository: Repository<Pcd>,

    @InjectRepository(Assessment)
    private assessmentsRepository: Repository<Assessment>,

    private schoolClassService: SchoolClassService,

    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async getStudents(paginationParams: PaginationParams, user: User) {
    const { page, limit, search } = paginationParams;

    const queryBuilder = this.studentRepository
      .createQueryBuilder("student")
      .select(["student.ALU_ID, student.ALU_NOME"]);

    if (search) {
      queryBuilder.andWhere(
        "student.ALU_NOME LIKE :q OR student.ALU_INEP LIKE :q",
        { q: `%${search}%` },
      );
    }

    if (user.USU_SPE.SPE_PER.PER_NOME === "Município") {
      queryBuilder
        .leftJoin("student.ALU_ESC", "ALU_ESC")
        .andWhere("ALU_ESC.ESC_MUN = :county", {
          county: user?.USU_MUN?.MUN_ID,
        });
    }

    if (user.USU_SPE.SPE_PER.PER_NOME === "Escola") {
      queryBuilder
        .leftJoin("student.ALU_ESC", "ALU_ESC")
        .andWhere("student.ALU_ESC.ESC_ID = :school", {
          school: user?.USU_ESC?.ESC_ID,
        });
    }
    const data = await paginateRaw(queryBuilder, {
      page: +page,
      limit: +limit,
      countQueries: false,
    });

    return data;
  }

  /**
   * Listagem de alunos com paginação, ordenação e pesquisa por nome
   * @param options adicionar o limite e qual página estamos
   * @param search permitir pesquisa por um termo pelo nome do aluno
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
    schoolId: number,
    serieId: number,
    active: "0" | "1",
    user: User,
  ) {
    const queryBuilder = this.studentRepository
      .createQueryBuilder("ALUNO")
      .select([
        "ALUNO.ALU_ID AS ALU_ID",
        "ALUNO.ALU_NOME AS ALU_NOME",
        "ALUNO.ALU_INEP AS ALU_INEP",
        "ESC_MUN.MUN_NOME AS MUN_NOME",
        "ALU_ESC.ESC_NOME AS ESC_NOME",
        "ALU_ESC.ESC_INEP AS ESC_INEP",
        "ALU_SER.SER_NOME AS SER_NOME",
        "ALU_TUR.TUR_NOME AS TUR_NOME",
        "ALUNO.ALU_ATIVO as ALU_ATIVO",
        "ALUNO.ALU_STATUS AS ALU_STATUS",
        "ALUNO.ALU_NOME_PAI AS ALU_NOME_PAI",
        "ALUNO.ALU_NOME_MAE AS ALU_NOME_MAE",
        "ALUNO.ALU_NOME_RESP AS ALU_NOME_RESP",
      ])
      .leftJoin("escola", "ALU_ESC", "ALU_ESC.ESC_ID = ALUNO.ALU_ESC_ID")
      .leftJoin("municipio", "ESC_MUN", "ESC_MUN.MUN_ID = ALU_ESC.ESC_MUN")
      .leftJoin("series", "ALU_SER", "ALU_SER.SER_ID = ALUNO.ALU_SER_ID")
      .leftJoin("turma", "ALU_TUR", "ALU_TUR.TUR_ID = ALUNO.ALU_TUR_ID");

    const queryBuilderNotGrouped = queryBuilder;

    let strQuery = "";
    if (search) {
      search = search.replace("°", "º");
      strQuery = ` ( ALUNO.ALU_NOME LIKE "%${search}%" OR ALUNO.ALU_INEP LIKE "%${search}%" OR ALU_ESC.ESC_NOME LIKE "%${search}%" OR ALU_ESC.ESC_INEP LIKE "%${search}%" ) `;
    }

    if (active) {
      strQuery += strQuery
        ? `AND ALUNO.ALU_ATIVO = '${active}' `
        : ` ALUNO.ALU_ATIVO  = '${active}' `;
    }

    if (serieId) {
      strQuery += strQuery
        ? `AND ALU_SER.SER_ID = '${serieId}' `
        : ` ALU_SER.SER_ID  = '${serieId}' `;
    }

    if (status) {
      strQuery += strQuery
        ? ` AND ALUNO.ALU_STATUS = '${status}' `
        : ` ALUNO.ALU_STATUS = '${status}' `;
    }

    if (countyId) {
      strQuery += strQuery
        ? `AND ALU_ESC.ESC_MUN.MUN_ID = '${countyId}' `
        : ` ALU_ESC.ESC_MUN.MUN_ID  = '${countyId}' `;
    }

    if (schoolId) {
      strQuery += strQuery
        ? `AND ALU_ESC.ESC_ID = '${schoolId}' `
        : ` ALU_ESC.ESC_ID = '${schoolId}' `;
    }

    if (user.USU_SPE.SPE_PER.PER_NOME === "Município") {
      strQuery += strQuery
        ? `AND ALU_ESC.ESC_MUN.MUN_ID = '${user?.USU_MUN?.MUN_ID}' `
        : ` ALU_ESC.ESC_MUN.MUN_ID  = '${user?.USU_MUN?.MUN_ID}' `;
    }

    if (user.USU_SPE.SPE_PER.PER_NOME === "Escola") {
      strQuery += strQuery
        ? `AND ALU_ESC.ESC_MUN.MUN_ID = '${user?.USU_MUN?.MUN_ID}' `
        : ` ALU_ESC.ESC_MUN.MUN_ID  = '${user?.USU_MUN?.MUN_ID}' `;

      strQuery += strQuery
        ? `AND ALU_ESC.ESC_ID = '${user?.USU_ESC?.ESC_ID}' `
        : ` ALU_ESC.ESC_ID = '${user?.USU_ESC?.ESC_ID}' `;
    }

    const order: any = orderBy;
    queryBuilder.orderBy(column, order);
    queryBuilder.where(strQuery);
    queryBuilderNotGrouped.andWhere(strQuery);

    const data = await paginateRaw<Student>(queryBuilder, {
      ...options,
      countQueries: false,
    });

    const totalNotGrouped = await queryBuilderNotGrouped
      .andWhere("ALUNO.ALU_STATUS = 'Não Enturmado'")
      .getCount();

    return {
      ...data,
      totalNotGrouped,
    };
  }

  async getByTransfer(
    options: IPaginationOptions,
    search: string,
    column: string,
    orderBy: string,
    status: string,
    countyId: number,
    schoolId: number,
    serieId: number,
    active: "0" | "1",
    user: User,
  ) {
    const queryBuilder = this.studentRepository
      .createQueryBuilder("ALUNO")
      .select([
        "ALUNO.ALU_ID AS ALU_ID",
        "ALUNO.ALU_NOME AS ALU_NOME",
        "ALUNO.ALU_INEP AS ALU_INEP",
        "ESC_MUN.MUN_NOME AS MUN_NOME",
        "ALU_ESC.ESC_NOME AS ESC_NOME",
        "ALU_ESC.ESC_INEP AS ESC_INEP",
        "ALU_SER.SER_NOME AS SER_NOME",
        "ALU_TUR.TUR_NOME AS TUR_NOME",
        "ALUNO.ALU_ATIVO as ALU_ATIVO",
        "ALUNO.ALU_STATUS AS ALU_STATUS",
        "ALUNO.ALU_NOME_PAI AS ALU_NOME_PAI",
        "ALUNO.ALU_NOME_MAE AS ALU_NOME_MAE",
        "ALUNO.ALU_NOME_RESP AS ALU_NOME_RESP",
      ])
      .leftJoin("escola", "ALU_ESC", "ALU_ESC.ESC_ID = ALUNO.ALU_ESC_ID")
      .leftJoin("municipio", "ESC_MUN", "ESC_MUN.MUN_ID = ALU_ESC.ESC_MUN")
      .leftJoin("series", "ALU_SER", "ALU_SER.SER_ID = ALUNO.ALU_SER_ID")
      .leftJoin("turma", "ALU_TUR", "ALU_TUR.TUR_ID = ALUNO.ALU_TUR_ID");

    let strQuery = "";
    if (search) {
      search = search.replace("°", "º");
      strQuery = ` ( ALUNO.ALU_NOME LIKE "%${search}%" OR ALUNO.ALU_INEP LIKE "%${search}%" OR ALU_ESC.ESC_NOME LIKE "%${search}%" OR ALU_ESC.ESC_INEP LIKE "%${search}%" OR ALUNO.ALU_CPF LIKE "%${search}%" ) `;
    }

    if (active) {
      strQuery += strQuery
        ? `AND ALUNO.ALU_ATIVO = '${active}' `
        : ` ALUNO.ALU_ATIVO  = '${active}' `;
    }

    if (serieId) {
      strQuery += strQuery
        ? `AND ALU_SER.SER_ID = '${serieId}' `
        : ` ALU_SER.SER_ID  = '${serieId}' `;
    }

    if (status) {
      strQuery += strQuery
        ? ` AND ALUNO.ALU_STATUS = '${status}' `
        : ` ALUNO.ALU_STATUS = '${status}' `;
    }

    if (countyId) {
      strQuery += strQuery
        ? `AND ALU_ESC.ESC_MUN.MUN_ID = '${countyId}' `
        : ` ALU_ESC.ESC_MUN.MUN_ID  = '${countyId}' `;
    }

    if (schoolId) {
      strQuery += strQuery
        ? `AND ALU_ESC.ESC_ID = '${schoolId}' `
        : ` ALU_ESC.ESC_ID = '${schoolId}' `;
    }

    if (user.USU_SPE.SPE_PER.PER_NOME !== "SAEV") {
      strQuery += strQuery
        ? `AND ALU_ESC.ESC_MUN.MUN_ID = '${user?.USU_MUN?.MUN_ID}' `
        : ` ALU_ESC.ESC_MUN.MUN_ID  = '${user?.USU_MUN?.MUN_ID}' `;
    }

    const order: any = orderBy;
    queryBuilder.orderBy(column, order);
    queryBuilder.where(strQuery);

    const data = await paginateRaw<Student>(queryBuilder, {
      ...options,
      countQueries: false,
    });

    return {
      ...data,
    };
  }

  async findStudentsByNamePaginated() {
    const queryBuilder = this.studentRepository
      .createQueryBuilder("ALUNO")
      .select(["ALUNO.ALU_ID", "ALUNO.ALU_NOME"]);

    return paginate(queryBuilder, { limit: 10, page: 1 });
  }

  async paginateByProfile(
    options: IPaginationOptions,
    search: string,
    column: string,
    orderBy: string,
    status: string,
    countyId: number,
    schoolId: number,
    serieId: number,
    user: User,
  ): Promise<Pagination<Student>> {
    const queryBuilder = this.studentRepository
      .createQueryBuilder("ALUNO")
      .select([
        "ALUNO.ALU_ID AS ALU_ID",
        "ALUNO.ALU_NOME AS ALU_NOME",
        "ALUNO.ALU_INEP AS ALU_INEP",
        "ESC_MUN.MUN_NOME AS MUN_NOME",
        "ALU_ESC.ESC_NOME AS ESC_NOME",
        "ALU_ESC.ESC_INEP AS ESC_INEP",
        "ALU_SER.SER_NOME AS SER_NOME",
        "ALU_TUR.TUR_NOME AS TUR_NOME",
        "ALUNO.ALU_ATIVO as ALU_ATIVO",
        "ALUNO.ALU_STATUS AS ALU_STATUS",
        "ALUNO.ALU_NOME_PAI AS ALU_NOME_PAI",
        "ALUNO.ALU_NOME_MAE AS ALU_NOME_MAE",
        "ALUNO.ALU_NOME_RESP AS ALU_NOME_RESP",
      ])
      .leftJoin("escola", "ALU_ESC", "ALU_ESC.ESC_ID = ALUNO.ALU_ESC_ID")
      .leftJoin("municipio", "ESC_MUN", "ESC_MUN.MUN_ID = ALU_ESC.ESC_MUN")
      .leftJoin("series", "ALU_SER", "ALU_SER.SER_ID = ALUNO.ALU_SER_ID")
      .leftJoin("turma", "ALU_TUR", "ALU_TUR.TUR_ID = ALUNO.ALU_TUR_ID");

    // revisar as colunas
    let strQuery = "";
    if (search) {
      search = search.replace("°", "º");
      strQuery = ` ( ALUNO.ALU_NOME LIKE "%${search}%" OR ALUNO.ALU_INEP LIKE "%${search}%" OR ALU_ESC.ESC_NOME LIKE "%${search}%" OR ALU_ESC.ESC_INEP LIKE "%${search}%" ) `;
    }

    if (serieId) {
      strQuery += strQuery
        ? `AND ALU_SER.SER_ID = '${serieId}' `
        : ` ALU_SER.SER_ID  = '${serieId}' `;
    }

    if (status) {
      strQuery += strQuery
        ? ` AND ALUNO.ALU_STATUS = '${status}' `
        : ` ALUNO.ALU_STATUS = '${status}' `;
    }

    if (countyId) {
      strQuery += strQuery
        ? `AND ALU_ESC.ESC_MUN.MUN_ID = '${countyId}' `
        : ` ALU_ESC.ESC_MUN.MUN_ID  = '${countyId}' `;
    }

    if (schoolId) {
      strQuery += strQuery
        ? `AND ALU_ESC.ESC_ID = '${schoolId}' `
        : ` ALU_ESC.ESC_ID = '${schoolId}' `;
    }

    if (user.USU_SPE.SPE_PER.PER_NOME === "Município") {
      strQuery += strQuery
        ? `AND ALU_ESC.ESC_MUN.MUN_ID = '${user?.USU_MUN?.MUN_ID}' `
        : ` ALU_ESC.ESC_MUN.MUN_ID  = '${user?.USU_MUN?.MUN_ID}' `;
    }

    if (user.USU_SPE.SPE_PER.PER_NOME === "Escola") {
      strQuery += strQuery
        ? `AND ALU_ESC.ESC_MUN.MUN_ID = '${user?.USU_MUN?.MUN_ID}' `
        : ` ALU_ESC.ESC_MUN.MUN_ID  = '${user?.USU_MUN?.MUN_ID}' `;

      strQuery += strQuery
        ? `AND ALU_ESC.ESC_ID = '${user?.USU_ESC?.ESC_ID}' `
        : ` ALU_ESC.ESC_ID = '${user?.USU_ESC?.ESC_ID}' `;
    }

    const order: any = orderBy;
    queryBuilder.orderBy(column, order);
    queryBuilder.where(strQuery);
    return paginateRaw<Student>(queryBuilder, {
      ...options,
      countQueries: false,
    });
  }

  /**
   * Criar aluno
   * @param createStudentDto objeto referente a criação de aluno
   * @returns informa que o aluno foi criado
   */
  async add(createStudentDto: CreateStudentDto, user: User) {
    return this.studentExists(
      createStudentDto.ALU_NOME,
      createStudentDto.ALU_INEP,
      createStudentDto.ALU_NOME_MAE,
      createStudentDto.ALU_CPF,
    ).then(async (exists: boolean) => {
      if (!exists) {
        return this.studentRepository
          .save(
            {
              ...createStudentDto,
            },
            { data: user },
          )
          .then(async (student) => {
            const turId = student?.ALU_TUR_ID ?? +student?.ALU_TUR;
            if (turId) {
              await this.schoolClassService.createSchoolClassStudent(student, {
                TUR_ID: turId,
              } as any);
            }
            return student as IStudent;
          });
      } else {
        throw new HttpException("Aluno já cadastrado.", HttpStatus.CONFLICT);
      }
    });
  }

  async addByImport(createStudentDto: CreateStudentDto, user: User) {
    return this.studentRepository
      .save(
        {
          ...createStudentDto,
        },
        { data: user },
      )
      .then(async (student) => {
        const turId = student?.ALU_TUR_ID ?? +student?.ALU_TUR;
        if (turId) {
          await this.schoolClassService.createSchoolClassStudent(student, {
            TUR_ID: turId,
          } as any);
        }
        return student as IStudent;
      });
  }

  async zoera(student: any) {
    await this.schoolClassService.createSchoolClassStudent(student, {
      TUR_ID: Number(student.ALU_TUR_ID),
    } as any);
  }

  /**
   * Retorna todos os alunos
   * @returns retorna uma lista de alunos
   */
  findAll(): Promise<IStudent[]> {
    return this.studentRepository.find({
      order: { ALU_NOME: "ASC" },
      relations: [
        "ALU_ESC",
        "ALU_SER",
        "ALU_TUR",
        "ALU_GEN",
        "ALU_PCD",
        "ALU_PEL",
      ],
    });
  }

  /**
   *
   * @param id informação referente a identificação do aluno
   * @returns retorna o aluno pesquisada
   */
  findOne(ALU_ID: number) {
    return this.studentRepository.findOne(
      { ALU_ID },
      {
        relations: [
          "ALU_ESC",
          "ALU_SER",
          "ALU_TUR",
          "ALU_GEN",
          "ALU_PCD",
          "ALU_PEL",
        ],
      },
    );
  }

  async evaluationHistory(paginationParams: PaginationParams, ALU_ID: string) {
    const { school, page, limit, order } = paginationParams;

    const orderBy = order.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const schoolClassTotalStudentss = await this.connection
      .getRepository(SchoolClassStudent)
      .createQueryBuilder("schoolClassStudent")
      .select("schoolClass.TUR_ID", "TUR_ID")
      .distinct()
      .innerJoin("schoolClassStudent.student", "student")
      .innerJoin("schoolClassStudent.schoolClass", "schoolClass")
      .where("schoolClass.TUR_ESC = :school", { school })
      .andWhere("schoolClass.TUR_ATIVO = TRUE")
      .andWhere("student.ALU_ID = :idStudent", { idStudent: +ALU_ID })
      .getRawMany();

    const ids = [];

    schoolClassTotalStudentss?.forEach((school) => {
      ids.push(school.TUR_ID);
    });

    const queryBuilderAssesments = this.assessmentsRepository
      .createQueryBuilder("AVALIACAO")
      .leftJoinAndSelect("AVALIACAO.AVA_TES", "AVA_TES")
      .leftJoin("AVALIACAO.AVA_AVM", "AVA_AVM")
      .leftJoin("AVA_AVM.AVM_MUN", "AVM_MUN")
      .leftJoin("AVM_MUN.schools", "schools")
      .leftJoinAndSelect("AVA_TES.TES_SER", "TES_SER")
      .leftJoinAndSelect("AVA_TES.STUDENTS_TEST", "STUDENTS_TEST")
      // .leftJoinAndSelect("STUDENTS_TEST.ANSWERS_TEST", "ANSWERS_TEST")
      // .leftJoin("STUDENTS_TEST.ALT_ALU", "ALT_ALU")
      .leftJoinAndSelect("AVA_TES.TES_DIS", "TES_DIS")
      .leftJoinAndSelect("AVA_TES.TEMPLATE_TEST", "TEMPLATE_TEST")
      .andWhere("STUDENTS_TEST.ALT_ALU = :ALT_ALU", { ALT_ALU: ALU_ID })
      .andWhere("schools.ESC_ID = :school", { school })
      .orderBy("AVALIACAO.AVA_ANO", orderBy);

    const totalItems = await queryBuilderAssesments.getCount();

    const data = await paginate(queryBuilderAssesments, {
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

    const items = await Promise.all(
      data.items.map(async (avaliacao) => {
        const subjects = await Promise.all(
          avaliacao.AVA_TES.map(async (test) => {
            let student;
            if(ids.length) {
              student = await this.connection
              .getRepository<StudentTest>(StudentTest)
              .createQueryBuilder("ALUNO_TESTE")
              .innerJoin(
                "ALUNO_TESTE.ALT_TES",
                "TESTE",
                "TESTE.TES_ID = ALUNO_TESTE.ALT_TES_ID",
              )
              .innerJoinAndSelect(
                "ALUNO_TESTE.ALT_ALU",
                "ALUNO",
                "ALUNO.ALU_ID = ALUNO_TESTE.ALT_ALU_ID",
              )
              .leftJoinAndSelect(
                "ALUNO_TESTE.ANSWERS_TEST",
                "ANSWERS_TEST",
                "ANSWERS_TEST.ATR_ALT_ID = ALUNO_TESTE.ALT_ID AND ALUNO_TESTE.ALT_FINALIZADO = 1",
              )
              .leftJoinAndSelect(
                "ANSWERS_TEST.questionTemplate",
                "questionTemplate",
              )
              .where("ALUNO_TESTE.ALT_TES_ID = :examId", {
                examId: test.TES_ID,
              })
              .andWhere("ALUNO.ALU_ID = :ALU_ID", { ALU_ID: +ALU_ID })
              .andWhere("ALUNO_TESTE.schoolClass IN(:...ids)", { ids })
              .getOne();
            }

            if (test.TES_DIS.DIS_TIPO === "Objetiva") {
              const ANSWERS_TEST = student?.ANSWERS_TEST?.filter((arr, index, self) =>
              index === self.findIndex((t) => (t?.questionTemplate?.TEG_ID === arr?.questionTemplate?.TEG_ID)))

              const questionsRight = ANSWERS_TEST?.filter(
                (question) => !!question?.ATR_CERTO,
              ).length;

              const totalRightQuestions = Math.floor(
                (questionsRight / test.TEMPLATE_TEST.length) * 100,
              );

              return {
                id: test.TES_DIS.DIS_ID,
                name: test.TES_DIS.DIS_NOME,
                totalRightQuestions,
              };
            } else {
              const isParticipated =
                !!student?.ANSWERS_TEST?.length && !student.ALT_JUSTIFICATIVA;

              return {
                id: test.TES_DIS.DIS_ID,
                name: test.TES_DIS.DIS_NOME,
                nivel: isParticipated
                  ? student?.ANSWERS_TEST[0]?.ATR_RESPOSTA
                  : "Não informado",
              };
            }
          }),
        );

        const filterSubjects = subjects.filter(function (a) {
          return (
            !this[JSON.stringify(a?.name)] &&
            (this[JSON.stringify(a?.name)] = true)
          );
        }, Object.create(null));

        return {
          id: avaliacao.AVA_ID,
          name: avaliacao.AVA_NOME,
          year: avaliacao.AVA_ANO,
          serie: avaliacao.AVA_TES[0].TES_SER.SER_NOME,
          subjects: filterSubjects,
        };
      }),
    );

    return {
      ...data,
      items,
    };
  }

  async findOneReports(ALU_ID: string) {
    const numberMonth = new Date().getMonth() + 1;
    const numberYear = new Date().getFullYear();

    const student = await this.studentRepository
      .createQueryBuilder("STUDENT")
      .leftJoinAndSelect("STUDENT.ALU_ESC", "ALU_ESC")
      .leftJoinAndSelect("STUDENT.ALU_SER", "ALU_SER")
      .leftJoinAndSelect("STUDENT.ALU_TUR", "ALU_TUR")
      .leftJoinAndSelect("STUDENT.ALU_GEN", "ALU_GEN")
      .leftJoinAndSelect("STUDENT.ALU_PCD", "ALU_PCD")
      .leftJoinAndSelect("STUDENT.ALU_PEL", "ALU_PEL")
      .leftJoinAndSelect("STUDENT.schoolClasses", "schoolClasses")
      .leftJoinAndSelect("schoolClasses.schoolClass", "schoolClass")
      .leftJoinAndSelect("schoolClass.TUR_ESC", "TUR_ESC")
      // .leftJoinAndSelect(
      //   "STUDENT.SCHOOL_ABSENCES",
      //   "SCHOOL_ABSENCES",
      //   `SCHOOL_ABSENCES.IFR_MES = ${numberMonth} AND SCHOOL_ABSENCES.IFR_ANO = ${numberYear}`,
      // )
      .where("STUDENT.ALU_ID = :ALU_ID", { ALU_ID })
      .getOne();

    let schools = [];

    student?.schoolClasses?.forEach((classStudent) => {
      if (
        !!classStudent &&
        classStudent?.schoolClass?.TUR_ESC?.ESC_ID !== student?.ALU_ESC?.ESC_ID
      ) {
        schools.push(classStudent.schoolClass.TUR_ESC);
      }
    });

    schools = schools.filter(function (a) {
      return (
        !this[JSON.stringify(a?.id)] && (this[JSON.stringify(a?.id)] = true)
      );
    }, Object.create(null));

    return {
      ...student,
      schoolClasses: schools,
      // INFREQUENCIA: student.SCHOOL_ABSENCES[0]?.IFR_FALTA ?? 0,
    };
  }

  /**
   *
   * @param id informação referente a identificação do município dentro da aluno
   * @returns retorna o aluno pesquisada
   */
  findBySchool(ESC_ID: string) {
    return this.studentRepository.find({
      order: { ALU_NOME: "ASC" },
      relations: [
        "ALU_ESC",
        "ALU_SER",
        "ALU_TUR",
        "ALU_GEN",
        "ALU_PCD",
        "ALU_PEL",
      ],
      where: { ALU_ESC: { ESC_ID: ESC_ID } },
    });
  }

  /**
   *
   * @param id informação referente a identificação do aluno
   * @param updateStudentDto objeto referente a criação de aluno
   * @returns informa que o aluno foi atualizada
   */
  update(
    ALU_ID: number,
    updateStudentDto: UpdateStudentDto,
    user: User,
  ): Promise<IStudent> {
    return this.studentRepository.save(
      { ...updateStudentDto, ALU_ID },
      { data: user },
    );
  }

  async updateWithValidate(
    ALU_ID: number,
    updateStudentDto: UpdateStudentDto,
    user: User,
  ): Promise<IStudent> {
    await this.findStudentUpdate(
      ALU_ID,
      updateStudentDto.ALU_NOME,
      updateStudentDto.ALU_INEP,
      updateStudentDto.ALU_NOME_MAE,
      updateStudentDto.ALU_CPF,
    );



    if (!updateStudentDto.ALU_ATIVO && !updateStudentDto.ALU_NOME) {
      const student = await this.studentRepository.findOne({
        where: {
          ALU_ID,
        },
        relations: ["ALU_ESC", 'ALU_TUR'],
      });

      if (student?.ALU_TUR) {
        const formattedInitialDate = new Date();
        formattedInitialDate.setUTCHours(23, 59, 59, 999);

        const formattedFinalDate = new Date();
        formattedFinalDate.setUTCHours(0, 0, 0, 0);
        let day = formattedFinalDate.getDate();
        day = day - 1;
        formattedFinalDate.setDate(day);

        const schoolClass = student.ALU_TUR;

        const queryBuilderAssesment = this.assessmentsRepository
          .createQueryBuilder("AVALIACAO")
          .leftJoin("AVALIACAO.AVA_TES", "AVA_TES")
          .leftJoinAndSelect("AVALIACAO.AVA_AVM", "AVA_AVM")
          .leftJoin("AVA_AVM.AVM_MUN", "AVM_MUN")
          .leftJoin("AVM_MUN.schools", "schools")
          .leftJoin("AVA_TES.STUDENTS_TEST", "STUDENTS_TEST")
          .leftJoin("STUDENTS_TEST.ALT_ALU", "ALT_ALU")
          .where("ALT_ALU.ALU_ID = :id", {
            id: ALU_ID,
          })
          .andWhere("schools.ESC_ID = :school", {
            school: student.ALU_ESC.ESC_ID,
          })
          .andWhere("DATE_SUB(AVA_AVM.AVM_DT_INICIO, INTERVAL 3 HOUR) <= :dateInitial", {
            dateInitial: formattedInitialDate,
          })
          .andWhere("DATE_SUB(AVA_AVM.AVM_DT_FIM, INTERVAL 3 HOUR) > :dateFinal", {
            dateFinal: formattedFinalDate,
          })
          .orderBy("AVALIACAO.AVA_DT_CRIACAO", "DESC");

        const dataAssesment = await queryBuilderAssesment.getOne();

        if (!!dataAssesment) {
          throw new BadRequestException(
            "Esse aluno não pode ser desativado, pois está em período de avaliação.",
          );
          return;
        }

        const update = await this.studentRepository.save(
          { ALU_ID, ALU_TUR: null, ALU_SER: null, ALU_STATUS: 'Não Enturmado', ALU_ATIVO: false },
          { data: user },
        );

        this.schoolClassService.createSchoolClassStudentEndDate(student, schoolClass)

        return update;
      }
    } 

    if(updateStudentDto.ALU_NOME) {
      delete updateStudentDto.ALU_ATIVO;
    }

    return this.studentRepository.save(
      { ...updateStudentDto, ALU_ID },
      { data: user },
    );
  }

  /**
   *
   * @param id informação referente a identificação do aluno
   * @param filename nome do arquivo salvo
   * @returns informa que o aluno foi atualizada
   */
  async updateAvatar(
    ALU_ID: number,
    filename: string,
    base64: string,
    user: User,
  ): Promise<string> {
    let student = await this.studentRepository.findOne({ ALU_ID: ALU_ID });
    const folderName = "./public/student/avatar/";
    const newFileName = editFileName(filename);
    if (student) {
      student.ALU_AVATAR = newFileName;
      writeFileSync(`${folderName}${newFileName}`, base64, {
        encoding: "base64",
      });
      await this.update(ALU_ID, student, user);
      return newFileName;
    } else {
      throw new HttpException(
        "Não é possível gravar esta imagem.",
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Verifica se já existe aluno cadastrado
   * @param ALU_NOME nome do aluno
   * @param ALU_INEP número inep do aluno
   * @param ALU_NOME_MAE nome da mãe do aluno
   * @returns
   */
  async studentExists(
    ALU_NOME: string,
    ALU_INEP: string,
    ALU_NOME_MAE: string,
    ALU_CPF?: string,
  ): Promise<boolean> {
    let student = null;

    if (ALU_INEP?.trim()) {
      student = await this.studentRepository.findOne({
        ALU_INEP,
      });

      if (student) {
        return true;
      }
    }

    if (ALU_CPF?.trim()) {
      student = await this.studentRepository.findOne({
        ALU_CPF,
      });

      if (student) {
        return true;
      }
    }

    student = await this.studentRepository.findOne({
      ALU_NOME,
      ALU_NOME_MAE,
    });

    if (student) {
      return true;
    } else {
      return false;
    }
  }

  async findStudentUpdate(
    ALU_ID: number,
    ALU_NOME: string,
    ALU_INEP: string,
    ALU_NOME_MAE: string,
    ALU_CPF?: string,
  ) {
    let student: Student | null = null;

    if (ALU_INEP?.trim()) {
      student = await this.studentRepository.findOne({
        ALU_INEP,
      });

      if (!!student && student.ALU_ID !== ALU_ID) {
        throw new BadRequestException(
          "Já existe aluno cadastrado com esse INEP.",
        );
      }
    }

    if (ALU_CPF?.trim()) {
      student = await this.studentRepository.findOne({
        ALU_CPF,
      });

      if (!!student && student.ALU_ID !== ALU_ID) {
        throw new BadRequestException(
          "Já existe aluno cadastrado com esse CPF.",
        );
      }
    }

    if (ALU_NOME?.trim() && ALU_NOME_MAE?.trim()) {
      student = await this.studentRepository.findOne({
        ALU_NOME,
        ALU_NOME_MAE,
      });

      if (!!student && student.ALU_ID !== ALU_ID) {
        throw new BadRequestException(
          "Já existe aluno cadastrado com essas informações.",
        );
      }
    }
  }

  /**
   * Retorna uma lista de todos os PcD
   * @returns retorna uma lista de PcD
   */
  findAllPcd(): Promise<Pcd[]> {
    return this.pcdRepository.find({ order: { PCD_NOME: "ASC" } });
  }

  async groupedStudents() {
    const students = await this.studentRepository
      .createQueryBuilder("Student")
      .select(["Student.ALU_ID", "ALU_TUR.TUR_ID", "ALU_TUR.TUR_NOME"])
      .leftJoin("Student.ALU_TUR", "ALU_TUR")
      .leftJoinAndSelect("Student.schoolClasses", "schoolClasses")
      .where("ALU_TUR.TUR_ANO = :year", { year: "2022" })
      .insert()
      .into(Student)
      .values({
        ALU_TUR: null,
        ALU_SER: null,
        ALU_STATUS: "Não Enturmado",
      })
      .execute();

    // for await (const student of students) {
    //   await this.schoolClassService.createSchoolClassStudentEndDate(student, student.ALU_TUR, 2022)
    //   await this.studentRepository.save({
    //     ...student,
    //     ALU_TUR: null,
    //     ALU_SER: null,
    //     ALU_STATUS: "Não Enturmado",
    //   });
    // }

    return students;
  }

  async groupStudent(dto: GroupStudentDto, user: User): Promise<void> {
    const { students, ALU_ESC, ALU_SER, ALU_TUR } = dto;

    let nameStudentsInTest: string[] = [];

    const formattedInitialDate = new Date();
    formattedInitialDate.setUTCHours(23, 59, 59, 999);

    const formattedFinalDate = new Date();
    formattedFinalDate.setUTCHours(0, 0, 0, 0);
    let day = formattedFinalDate.getDate();
    day = day - 1;
    formattedFinalDate.setDate(day);

    const studentsGrouped: Student[] = [];

    if (students?.length > 10) {
      throw new ForbiddenException("Você pode enturmar 10 alunos por vez.");
    }

    for (const idStudent of students) {
      const student = await this.studentRepository.findOne({
        where: {
          ALU_ID: idStudent,
        },
        relations: ["ALU_ESC", "ALU_TUR"],
      });

      if (student && !!student?.ALU_TUR?.TUR_ID) {
        const queryBuilderAssesment = this.assessmentsRepository
          .createQueryBuilder("AVALIACAO")
          .leftJoin("AVALIACAO.AVA_TES", "AVA_TES")
          .leftJoin("AVALIACAO.AVA_AVM", "AVA_AVM")
          .leftJoin("AVA_AVM.AVM_MUN", "AVM_MUN")
          .leftJoin("AVM_MUN.schools", "schools")
          .leftJoin("AVA_TES.STUDENTS_TEST", "STUDENTS_TEST")
          .leftJoin("STUDENTS_TEST.ALT_ALU", "ALT_ALU")
          .where("ALT_ALU.ALU_ID = :id", { id: idStudent })
          .andWhere("DATE_SUB(AVA_AVM.AVM_DT_INICIO, INTERVAL 3 HOUR) <= :date", {
            date: formattedInitialDate,
          })
          .andWhere("DATE_SUB(AVA_AVM.AVM_DT_FIM, INTERVAL 3 HOUR) > :date", { date: formattedFinalDate })
          .orderBy("AVALIACAO.AVA_DT_CRIACAO", "DESC");

        if (student?.ALU_ESC?.ESC_ID) {
          queryBuilderAssesment.andWhere("schools.ESC_ID = :school", {
            school: student?.ALU_ESC?.ESC_ID,
          });
        }

        const dataAssesment = await queryBuilderAssesment.getOne();

        if (!!dataAssesment) {
          nameStudentsInTest.push(student.ALU_NOME);
          break;
        }
      }
      studentsGrouped.push({
        ...student,
        ALU_ESC,
        ALU_SER,
        ALU_TUR,
        ALU_STATUS: "Enturmado",
      });
    }

    if (nameStudentsInTest.length) {
      throw new BadRequestException({
        message: {
          text: "Você não pode enturmar alunos que estão em período de avaliação",
          students: nameStudentsInTest,
        },
      });
    }

    await Promise.all(
      studentsGrouped.map(async (student) => {
        await this.studentRepository.save(
          {
            ...student,
            ALU_ESC,
            ALU_SER,
            ALU_TUR,
            ALU_STATUS: "Enturmado",
            ALU_ATIVO: true
          },
          {
            data: user,
          },
        );

        await this.schoolClassService.createSchoolClassStudent(
          student,
          ALU_TUR,
        );
      }),
    );
  }
}
