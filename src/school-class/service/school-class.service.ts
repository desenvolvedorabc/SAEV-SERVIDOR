import { ForbiddenException, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  IPaginationOptions,
  paginateRaw,
  Pagination,
} from "nestjs-typeorm-paginate";
import { Student } from "src/student/model/entities/student.entity";
import { User } from "src/user/model/entities/user.entity";
import { In, Repository } from "typeorm";
import { CreateSchoolClassDto } from "../model/dto/create-school-class.dto";
import { UpdateSchoolClassDto } from "../model/dto/update-school-class.dto";
import { SchoolClassStudent } from "../model/entities/school-class-student.entity";
import { SchoolClass } from "../model/entities/school-class.entity";
import { PaginationParams } from "src/helpers/params";

@Injectable()
export class SchoolClassService {
  constructor(
    @InjectRepository(SchoolClass)
    private schollClassRepository: Repository<SchoolClass>,

    @InjectRepository(Student)
    private studentRepository: Repository<Student>,

    @InjectRepository(SchoolClassStudent)
    private schollClassStudentRepository: Repository<SchoolClassStudent>,
  ) {}

  findAll(): Promise<SchoolClass[]> {
    return this.schollClassRepository.find({
      relations: ["TUR_ESC", "TUR_SER", "TUR_MUN", "TUR_PRO"],
      order: { TUR_NOME: "ASC" },
    });
  }

  findOne(TUR_ID: number): Promise<SchoolClass> {
    return this.schollClassRepository.findOne(
      { TUR_ID: TUR_ID },
      { relations: ["TUR_ESC", "TUR_SER", "TUR_MUN", "TUR_PRO"] },
    );
  }

  /**
   *
   * @param id informação referente a escola dentro da turma
   * @returns retorna a turma pesquisada
   */
  async findBySchoolAndSerie(
    schoolId: string,
    series: string,
    { active, year }: PaginationParams,
  ) {
    const queryBuilder = this.schollClassRepository
      .createQueryBuilder("SchoolClass")
      .leftJoinAndSelect("SchoolClass.TUR_ESC", "TUR_ESC")
      .leftJoinAndSelect("SchoolClass.TUR_SER", "TUR_SER")
      .leftJoinAndSelect("SchoolClass.TUR_MUN", "TUR_MUN")
      .andWhere("TUR_ESC.ESC_ID = :schoolId", { schoolId })
      .orderBy("SchoolClass.TUR_NOME", "ASC");

    if (active) {
      queryBuilder.andWhere("SchoolClass.TUR_ATIVO = :active", { active });
    }

    if (year) {
      queryBuilder.andWhere("SchoolClass.TUR_ANO = :year", { year });
    }

    if (!!series) {
      queryBuilder.andWhere("TUR_SER.SER_ID IN(:...series)", {
        series: series?.split(","),
      });
    }

    const data = await queryBuilder.getMany();

    return data;
  }

  /**
   *
   * @param options
   * @param _search
   * @param _column
   * @param _orderBy
   * @param _year
   * @param _county
   * @param _school
   * @param _type
   * @param _status
   * @returns
   */
  async paginate(
    options: IPaginationOptions,
    search: string,
    column: string,
    orderBy: string,
    year: string,
    countyId: number,
    schoolId: number,
    type: string,
    status: string,
    user: User,
    serieId: number,
    active?: "0" | "1",
  ): Promise<Pagination<any>> {
    const queryBuilder = this.schollClassRepository
      .createQueryBuilder("TURMA")
      .select([
        "TURMA.TUR_ID",
        "TURMA.TUR_NOME",
        "TURMA.TUR_ANO",
        "TURMA.TUR_TIPO",
        "TUR_MUN.MUN_NOME",
        "TUR_ESC.ESC_NOME",
        "TUR_SER.SER_NOME",
        "TURMA.TUR_PERIODO",
        "TURMA.TUR_ATIVO",
      ])
      .leftJoin("TURMA.TUR_SER", "TUR_SER")
      .leftJoin("TURMA.TUR_ESC", "TUR_ESC")
      .leftJoin("TURMA.TUR_MUN", "TUR_MUN");

    const order: any = orderBy;

    switch (column) {
      case "TURMA_TUR_NOME":
        queryBuilder.orderBy("TURMA.TUR_NOME", order);
        break;
      case "TURMA_TUR_ANO":
        queryBuilder.orderBy("TURMA.TUR_ANO", order);
        break;
      case "TURMA_TUR_TIPO":
        queryBuilder.orderBy("TURMA.TUR_TIPO", order);
        break;
      case "TUR_MUN_MUN_NOME":
        queryBuilder.orderBy("TUR_MUN.MUN_NOME", order);
        break;
      case "TUR_ESC_ESC_NOME":
        queryBuilder.orderBy("TUR_ESC.ESC_NOME", order);
        break;
      case "TUR_SER_SER_NOME":
        queryBuilder.orderBy("TUR_SER.SER_NOME", order);
        break;
      case "TURMA_TUR_ATIVO":
        queryBuilder.orderBy("TURMA.TUR_ATIVO", order);
        break;
      case "TURMA_TUR_ID":
        queryBuilder.orderBy("TURMA.TUR_ID", order);
        break;
      case "TURMA_TUR_PERIODO":
        queryBuilder.orderBy("TURMA.TUR_PERIODO", order);
        break;
      default:
        queryBuilder.orderBy("TURMA.TUR_ANO", "DESC");
        break;
    }

    let strQuery = "";

    if (year) {
      strQuery = ` TURMA.TUR_ANO = '${year}' `;
    }

    if (countyId) {
      if (strQuery) {
        strQuery += " AND ";
      }
      strQuery += ` TURMA.TUR_MUN.MUN_ID = '${countyId}' `;
    }

    if (schoolId) {
      if (strQuery) {
        strQuery += " AND ";
      }
      strQuery += ` TURMA.TUR_ESC.ESC_ID = '${schoolId}' `;
    }

    if (type) {
      if (strQuery) {
        strQuery += " AND ";
      }
      strQuery += ` TURMA.TUR_TIPO = '${type}' `;
    }

    if (status) {
      if (strQuery) {
        strQuery += " AND ";
      }
      strQuery += ` TURMA.TUR_ATIVO = '${status}' `;
    }

    if (user.USU_SPE.SPE_PER.PER_NOME === "Município") {
      strQuery += strQuery
        ? `AND TURMA.TUR_MUN.MUN_ID = '${user?.USU_MUN?.MUN_ID}' `
        : ` TURMA.TUR_MUN.MUN_ID  = '${user?.USU_MUN?.MUN_ID}' `;
    }

    if (user.USU_SPE.SPE_PER.PER_NOME === "Escola") {
      strQuery += strQuery
        ? `AND TURMA.TUR_MUN.MUN_ID = '${user?.USU_MUN?.MUN_ID}' `
        : ` TURMA.TUR_MUN.MUN_ID  = '${user?.USU_MUN?.MUN_ID}' `;

      strQuery += strQuery
        ? `AND TURMA.TUR_ESC.ESC_ID = '${user?.USU_ESC?.ESC_ID}' `
        : ` TURMA.TUR_ESC.ESC_ID = '${user?.USU_ESC?.ESC_ID}' `;
    }

    queryBuilder.where(strQuery);

    if (active) {
      queryBuilder.andWhere("TURMA.TUR_ATIVO = :active", { active });
    }

    if (search) {
      queryBuilder.andWhere("TURMA.TUR_NOME LIKE :q", { q: `%${search}%` });
    }

    if (serieId) {
      queryBuilder.andWhere("TUR_SER.SER_ID = :serieId", { serieId });
    }

    return paginateRaw<SchoolClass>(queryBuilder, options);
  }

  /**
   * Retorna todos as séries da escola
   *
   * @returns retorna uma lista de série
   */
  findSerieBySchool(idSchool: string): Promise<SchoolClass[]> {
    return this.schollClassRepository
      .createQueryBuilder("TURMA")
      .select(["TUR_SER.SER_ID AS SER_ID, TUR_SER.SER_NOME AS SER_NOME"])
      .leftJoin("TURMA.TUR_SER", "TUR_SER")
      .leftJoin("TURMA.TUR_ESC", "TUR_ESC")
      .where(`TUR_ESC.ESC_ID = '${idSchool}'`)
      .andWhere("TUR_SER.SER_ATIVO = 1")
      .groupBy("TURMA.TUR_SER")
      .execute();
  }

  /**
   * Criar turma
   *
   * @param createSchoolClassDto objeto referente a criação de turma
   * @returns informa que o turma foi criada
   */
  async add(createSchoolClassDto: CreateSchoolClassDto, user: User) {
    const { schoolClass } = await this.verifyExistsSchoolClass(
      createSchoolClassDto,
    );

    if (schoolClass) {
      throw new ForbiddenException("Turma já cadastrada.");
    }

    return this.schoolClassExists(createSchoolClassDto).then(
      (exists: boolean) => {
        if (!exists) {
          return this.schollClassRepository
            .save(createSchoolClassDto, { data: user })
            .then((createSchoolClass: SchoolClass) => {
              return createSchoolClass;
            });
        } else {
          throw new HttpException("Turma já cadastrada.", HttpStatus.CONFLICT);
        }
      },
    );
  }

  async verifyExistsSchoolClass(
    dto: UpdateSchoolClassDto,
  ): Promise<{ schoolClass: SchoolClass | null }> {
    const { TUR_ANO, TUR_NOME, TUR_PERIODO, TUR_ESC } = dto;

    const schoolClass = await this.schollClassRepository.findOne({
      where: {
        TUR_ANO,
        TUR_NOME,
        TUR_PERIODO,
        TUR_ESC: {
          ESC_ID: TUR_ESC,
        },
      },
    });

    return {
      schoolClass,
    };
  }

  async createSchoolClassStudent(student: Student, schoolClass: SchoolClass) {
    const date = new Date();
    let findSchoolClassStudent = await this.schollClassStudentRepository
      .createQueryBuilder("class")
      .leftJoinAndSelect("class.student", "student")
      .leftJoinAndSelect("class.schoolClass", "schoolClass")
      .where("student.ALU_ID = :id", { id: student.ALU_ID })
      .orderBy("class.createdAt", "DESC")
      .getOne();

    if (findSchoolClassStudent?.schoolClass?.TUR_ID === schoolClass?.TUR_ID) {
      return;
    }

    if (findSchoolClassStudent && !findSchoolClassStudent?.endDate) {
      findSchoolClassStudent.endDate = date;

      await this.schollClassStudentRepository.save(findSchoolClassStudent);
    }

    const schoolClassStudent = this.schollClassStudentRepository.create({
      student,
      schoolClass,
      startDate: date,
    });

    await this.schollClassStudentRepository.save(schoolClassStudent);
  }

  async createSchoolClassStudentEndDate(
    student: Student,
    schoolClass: SchoolClass,
  ) {
    const date = new Date();
    let findSchoolClassStudent = await this.schollClassStudentRepository
      .createQueryBuilder("class")
      .leftJoinAndSelect("class.student", "student")
      .leftJoin("class.schoolClass", "schoolClass")
      .where("student.ALU_ID = :id", { id: student.ALU_ID })
      .andWhere("schoolClass.TUR_ID = :turId", { turId: schoolClass.TUR_ID })
      .orderBy("class.createdAt", "DESC")
      .getOne();

    if (findSchoolClassStudent) {
      findSchoolClassStudent.endDate = date;
      findSchoolClassStudent.startDate =
        findSchoolClassStudent.startDate ?? date;

      return await this.schollClassStudentRepository.save(
        findSchoolClassStudent,
      );
    }

    const schoolClassStudent = this.schollClassStudentRepository.create({
      student,
      schoolClass,
      startDate: date,
      endDate: date,
    });

    await this.schollClassStudentRepository.save(schoolClassStudent);
  }

  /**
   *
   * @param id informação referente a identificação da turma
   * @param updateSchoolClassDto objeto referente a criação de turma
   * @returns informa que a turma foi atualizada
   */
  async update(
    TUR_ID: number,
    updateSchoolClassDto: UpdateSchoolClassDto,
    user: User,
  ): Promise<SchoolClass> {
    const { schoolClass } = await this.verifyExistsSchoolClass(
      updateSchoolClassDto,
    );

    if (schoolClass?.TUR_ID && schoolClass?.TUR_ID !== TUR_ID) {
      throw new ForbiddenException("Turma já cadastrada.");
    }

    const school = this.schollClassRepository
      .save({ ...updateSchoolClassDto, TUR_ID }, { data: user })
      .then((updateSchoolClass: SchoolClass) => {
        return updateSchoolClass;
      });

    if (
      !updateSchoolClassDto.TUR_ATIVO !== undefined &&
      !updateSchoolClassDto.TUR_ATIVO
    ) {
      this.uncrowdStudentsBySchool(TUR_ID);
    }

    return school;
  }

  async uncrowdStudentsBySchool(idSchoolClass: number): Promise<void> {
    const students = await this.studentRepository.find({
      where: {
        ALU_TUR: {
          TUR_ID: idSchoolClass,
        },
      },
    });

    for (const student of students) {
      const schoolClass = {
        TUR_ID: idSchoolClass,
      } as any;

      await this.createSchoolClassStudentEndDate(student, schoolClass);
      await this.studentRepository.save({
        ...student,
        ALU_TUR: null,
        ALU_SER: null,
        ALU_STATUS: "Não Enturmado",
      });
    }
  }

  /**
   * Verificação se já existe o mesmo avaliação, com mesmo estado e cidade
   * @returns retorna o resultado da consulta como VERDADEIRO ou FALSO
   */
  async schoolClassExists(
    createSchoolClassDto: CreateSchoolClassDto,
  ): Promise<boolean> {
    const assessment = await this.schollClassRepository.findOne({
      TUR_ANO: createSchoolClassDto.TUR_ANO,
      TUR_MUN: createSchoolClassDto.TUR_MUN,
      TUR_ESC: createSchoolClassDto.TUR_ESC,
      TUR_SER: createSchoolClassDto.TUR_SER,
      TUR_PERIODO: createSchoolClassDto.TUR_PERIODO,
      TUR_TIPO: createSchoolClassDto.TUR_TIPO,
      TUR_NOME: createSchoolClassDto.TUR_NOME,
    });
    return assessment ? true : false;
  }
}
