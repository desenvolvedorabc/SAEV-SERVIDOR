import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import { Connection, Repository } from "typeorm";
import { Student } from "../model/entities/student.entity";
import { IStudent } from "../model/interface/student.interface";
import { CreateStudentDto } from "../model/dto/create-student.dto";
import { UpdateStudentDto } from "../model/dto/update-student.dto";
import { paginateRaw } from "nestjs-typeorm-paginate";
import { editFileName } from "../../helpers/utils";
import { writeFileSync } from "fs";
import { Pcd } from "src/shared/model/entities/pcd.entity";
import { GroupStudentDto } from "../model/dto/group-student.dto";
import { Assessment } from "src/assessment/model/entities/assessment.entity";
import { PaginationParams } from "src/helpers/params";
import { User } from "src/user/model/entities/user.entity";
import { SchoolClassService } from "src/school-class/service/school-class.service";
import { SchoolClassStudent } from "src/school-class/model/entities/school-class-student.entity";
import { StudentTest } from "src/release-results/model/entities/student-test.entity";
import { paginateData } from "src/utils/paginate-data";
import { Parser } from "json2csv";
import { mapperResponseStudents } from "../mappers";

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(SchoolClassStudent)
    private schoolClassStudentRepository: Repository<SchoolClassStudent>,
    @InjectRepository(Pcd)
    private pcdRepository: Repository<Pcd>,

    @InjectRepository(Assessment)
    private assessmentsRepository: Repository<Assessment>,

    private schoolClassService: SchoolClassService,

    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async getStudentsNames(paginationParams: PaginationParams, user: User) {
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

    if (user.USU_SPE.SPE_PER.PER_NOME !== "SAEV") {
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

  async paginate(params: PaginationParams, user: User) {
    const { page, limit } = params;
    const { queryBuilder } = this.getQueryBuilderForPaginateStudents(
      params,
      user,
    );

    if (user.USU_SPE.SPE_PER.PER_NOME === "Escola") {
      queryBuilder.andWhere("ALU_ESC.ESC_ID = :schoolId", {
        schoolId: user?.USU_ESC?.ESC_ID,
      });
    }

    const data = await paginateData(
      page,
      limit,
      queryBuilder,
      params.isCsv,
      false,
    );

    const { items } = mapperResponseStudents(data.items);

    return {
      ...data,
      items,
    };
  }

  async paginateWithTotalNotGrouped(params: PaginationParams, user: User) {
    const { page, limit } = params;
    const { queryBuilder } = this.getQueryBuilderForPaginateStudents(
      params,
      user,
    );

    if (user.USU_SPE.SPE_PER.PER_NOME === "Escola") {
      queryBuilder.andWhere("ALU_ESC.ESC_ID = :schoolId", {
        schoolId: user?.USU_ESC?.ESC_ID,
      });
    }

    const queryBuilderNotGrouped = queryBuilder;

    const data = await paginateData(
      page,
      limit,
      queryBuilder,
      params.isCsv,
      false,
    );

    const { items } = mapperResponseStudents(data.items);

    const totalNotGrouped = await queryBuilderNotGrouped
      .andWhere("Student.ALU_TUR IS NULL")
      .getCount();

    return {
      ...{
        ...data,
        items,
      },
      totalNotGrouped,
    };
  }

  async getByTransfer(params: PaginationParams, user: User) {
    const { page, limit } = params;
    const { queryBuilder } = this.getQueryBuilderForPaginateStudents(
      params,
      user,
    );

    const data = await paginateData(page, limit, queryBuilder, false, false);

    const { items } = mapperResponseStudents(data.items);

    return {
      ...data,
      items,
    };
  }

  async generateCsv(params: PaginationParams, user: User) {
    if (!params?.county) {
      throw new BadRequestException("Informe pelo menos o município.");
    }

    const data: any = await this.paginate({ ...params, isCsv: true }, user);

    const mapperData = data?.items?.map((student) => {
      return {
        ...student,
        ALU_ATIVO: student.ALU_ATIVO ? "Sim" : "Não",
        SER_NOME: student?.SER_NOME ?? "N/A",
        TUR_NOME: student?.TUR_NOME ?? "N/A",
      };
    });

    const parser = new Parser({
      withBOM: true,
      delimiter: ",",
    });

    const csvData = parser.parse(mapperData);

    return csvData;
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
              ALU_PCD: null,
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
          ALU_PCD: null,
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

  async createSchoolClassByStudent(student: any) {
    await this.schoolClassService.createSchoolClassStudent(student, {
      TUR_ID: Number(student.ALU_TUR_ID),
    } as any);
  }

  async findOne(id: number) {
    const student = await this.studentRepository.findOne(
      { ALU_ID: id },
      {
        relations: [
          "ALU_ESC",
          "ALU_SER",
          "ALU_TUR",
          "ALU_GEN",
          "ALU_PEL",
          "ALU_DEFICIENCIAS",
        ],
      },
    );

    if (!student) {
      throw new NotFoundException("Aluno não encontrado.");
    }

    return student;
  }

  async evaluationHistory(paginationParams: PaginationParams, ALU_ID: string) {
    const { school, page, limit, order } = paginationParams;

    const schoolClassTotalStudents = await this.connection
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

    schoolClassTotalStudents?.forEach((school) => {
      ids.push(school.TUR_ID);
    });

    const queryBuilderAssessments = this.assessmentsRepository
      .createQueryBuilder("AVALIACAO")
      .leftJoinAndSelect("AVALIACAO.AVA_TES", "AVA_TES")
      .leftJoin("AVALIACAO.AVA_AVM", "AVA_AVM")
      .leftJoin("AVA_AVM.AVM_MUN", "AVM_MUN")
      .leftJoin("AVM_MUN.schools", "schools")
      .leftJoinAndSelect("AVA_TES.TES_SER", "TES_SER")
      .leftJoinAndSelect("AVA_TES.STUDENTS_TEST", "STUDENTS_TEST")
      .leftJoinAndSelect("AVA_TES.TES_DIS", "TES_DIS")
      .leftJoinAndSelect("AVA_TES.TEMPLATE_TEST", "TEMPLATE_TEST")
      .andWhere("STUDENTS_TEST.ALT_ALU = :ALT_ALU", { ALT_ALU: ALU_ID })
      .andWhere("schools.ESC_ID = :school", { school })
      .orderBy("AVALIACAO.AVA_ANO", order);

    const data = await paginateData(+page, +limit, queryBuilderAssessments);

    const items = await Promise.all(
      data.items.map(async (avaliacao) => {
        const subjects = await Promise.all(
          avaliacao.AVA_TES.map(async (test) => {
            let student;
            if (ids.length) {
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
              const ANSWERS_TEST = student?.ANSWERS_TEST?.filter(
                (arr, index, self) =>
                  index ===
                  self.findIndex(
                    (t) =>
                      t?.questionTemplate?.TEG_ID ===
                      arr?.questionTemplate?.TEG_ID,
                  ),
              );

              const questionsRight = ANSWERS_TEST?.filter(
                (question) => !!question?.ATR_CERTO,
              ).length;

              const totalRightQuestions = Math.round(
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
                  : "nao_informado",
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
    const student = await this.studentRepository
      .createQueryBuilder("Student")
      .leftJoinAndSelect("Student.ALU_ESC", "ALU_ESC")
      .leftJoinAndSelect("Student.ALU_SER", "ALU_SER")
      .leftJoinAndSelect("Student.ALU_TUR", "ALU_TUR")
      .leftJoinAndSelect("Student.ALU_GEN", "ALU_GEN")
      .leftJoinAndSelect("Student.ALU_DEFICIENCIAS", "ALU_DEFICIENCIAS")
      .leftJoinAndSelect("Student.ALU_PEL", "ALU_PEL")
      .leftJoinAndSelect("Student.schoolClasses", "schoolClasses")
      .leftJoinAndSelect("schoolClasses.schoolClass", "schoolClass")
      .leftJoinAndSelect("schoolClass.TUR_ESC", "TUR_ESC")
      .where("Student.ALU_ID = :ALU_ID", { ALU_ID })
      .getOne();

    let schools = [];

    student?.schoolClasses?.forEach((classStudent) => {
      if (
        !!classStudent &&
        classStudent?.schoolClass?.TUR_ESC?.ESC_ID !== student?.ALU_ESC?.ESC_ID
      ) {
        if (classStudent?.schoolClass?.TUR_ESC) {
          schools.push(classStudent?.schoolClass?.TUR_ESC);
        }
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
      relations: ["ALU_ESC", "ALU_SER", "ALU_TUR", "ALU_GEN", "ALU_PEL"],
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
        relations: ["ALU_ESC", "ALU_TUR"],
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
          .andWhere(
            "DATE_SUB(AVA_AVM.AVM_DT_INICIO, INTERVAL 3 HOUR) <= :dateInitial",
            {
              dateInitial: formattedInitialDate,
            },
          )
          .andWhere(
            "DATE_SUB(AVA_AVM.AVM_DT_FIM, INTERVAL 3 HOUR) > :dateFinal",
            {
              dateFinal: formattedFinalDate,
            },
          )
          .orderBy("AVALIACAO.AVA_DT_CRIACAO", "DESC");

        const dataAssesment = await queryBuilderAssesment.getOne();

        if (!!dataAssesment) {
          throw new BadRequestException(
            "Esse aluno não pode ser desativado, pois está em período de avaliação.",
          );
          return;
        }

        const update = await this.studentRepository.save(
          {
            ALU_ID,
            ALU_TUR: null,
            ALU_SER: null,
            ALU_STATUS: "Não Enturmado",
            ALU_ATIVO: false,
          },
          { data: user },
        );

        this.schoolClassService.createSchoolClassStudentEndDate(
          student,
          schoolClass,
        );

        return update;
      }
    }

    if (updateStudentDto.ALU_NOME) {
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
          .andWhere(
            "DATE_SUB(AVA_AVM.AVM_DT_INICIO, INTERVAL 3 HOUR) <= :date",
            {
              date: formattedInitialDate,
            },
          )
          .andWhere("DATE_SUB(AVA_AVM.AVM_DT_FIM, INTERVAL 3 HOUR) > :date", {
            date: formattedFinalDate,
          })
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
            ALU_ATIVO: true,
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

  async getTotalStudentsGrouped(
    { county, school, serie, schoolClass, year }: PaginationParams,
    user: User,
  ) {
    const queryBuilder = this.schoolClassStudentRepository
      .createQueryBuilder("SchoolClassStudent")
      .select(
        "COUNT(DISTINCT CONCAT(SchoolClassStudent.studentALUID, '_', SchoolClassStudent.schoolClassTURID))",
        "totalGrouped",
      )
      .innerJoin("SchoolClassStudent.schoolClass", "schoolClass")
      .where("schoolClass.TUR_ANO = :year", { year });

    if (county) {
      queryBuilder.andWhere("schoolClass.TUR_MUN = :county", {
        county,
      });
    }

    if (school) {
      queryBuilder.andWhere("schoolClass.TUR_ESC = :school", {
        school,
      });
    }

    if (serie) {
      queryBuilder.andWhere("schoolClass.TUR_SER = :serie", {
        serie,
      });
    }

    if (schoolClass) {
      queryBuilder.andWhere("schoolClass.TUR_ID = :schoolClass", {
        schoolClass,
      });
    }

    if (user.USU_SPE.SPE_PER.PER_NOME !== "SAEV") {
      queryBuilder.andWhere("schoolClass.TUR_MUN = :county", {
        county: user?.USU_MUN?.MUN_ID,
      });
    }

    if (user.USU_SPE.SPE_PER.PER_NOME === "Escola") {
      queryBuilder.andWhere("schoolClass.TUR_ESC = :school", {
        school: user?.USU_ESC?.ESC_ID,
      });
    }

    const result = await queryBuilder.getRawOne();

    return {
      totalGrouped: result ? +result?.totalGrouped : 0,
    };
  }

  async getStudentsGroupedBySchoolClass(
    { page, limit, schoolClass }: PaginationParams,
    isCsv = false,
  ) {
    const queryBuilder = this.schoolClassStudentRepository
      .createQueryBuilder("SchoolClassStudent")
      .innerJoin("SchoolClassStudent.student", "student")
      .select(["SchoolClassStudent.id", "student.ALU_ID", "student.ALU_NOME"])
      .where("SchoolClassStudent.schoolClassTURID = :schoolClass", {
        schoolClass,
      })
      .groupBy("student.ALU_ID")
      .orderBy("student.ALU_NOME", "ASC");

    const data = await paginateData(page, limit, queryBuilder, isCsv);

    const items = data.items.map((item) => {
      return {
        ...item.student,
      };
    });

    return {
      ...data,
      items,
    };
  }

  private getQueryBuilderForPaginateStudents(
    {
      search,
      active,
      column,
      school,
      serie,
      status,
      county,
      order,
    }: PaginationParams,
    user: User,
  ) {
    const queryBuilder = this.studentRepository
      .createQueryBuilder("Student")
      .select([
        "Student",
        "ESC_MUN.MUN_NOME",
        "ALU_ESC.ESC_NOME",
        "ALU_ESC.ESC_INEP",
        "ALU_SER.SER_NOME",
        "ALU_TUR.TUR_NOME",
      ])
      .leftJoin("Student.ALU_ESC", "ALU_ESC")
      .leftJoin("ALU_ESC.ESC_MUN", "ESC_MUN")
      .leftJoin("Student.ALU_SER", "ALU_SER")
      .leftJoin("Student.ALU_TUR", "ALU_TUR")
      .orderBy(`Student.${column ?? "ALU_NOME"}`, order);

    if (search) {
      queryBuilder.andWhere(
        "(Student.ALU_NOME LIKE :search OR Student.ALU_INEP LIKE :search)",
        { search: `%${search}%` },
      );
    }

    if (active !== null) {
      queryBuilder.andWhere("Student.ALU_ATIVO = :active", { active });
    }

    if (serie) {
      queryBuilder.andWhere("ALU_SER.SER_ID = :serieId", { serieId: serie });
    }

    if (status) {
      queryBuilder.andWhere("Student.ALU_STATUS = :status", { status });
    }

    if (county) {
      queryBuilder.andWhere("ALU_ESC.ESC_MUN.MUN_ID = :countyId", {
        countyId: county,
      });
    }

    if (school) {
      queryBuilder.andWhere("ALU_ESC.ESC_ID = :schoolId", { schoolId: school });
    }

    if (user.USU_SPE.SPE_PER.PER_NOME !== "SAEV") {
      queryBuilder.andWhere("ALU_ESC.ESC_MUN.MUN_ID = :countyId", {
        countyId: user?.USU_MUN?.MUN_ID,
      });
    }

    return {
      queryBuilder,
    };
  }
}
