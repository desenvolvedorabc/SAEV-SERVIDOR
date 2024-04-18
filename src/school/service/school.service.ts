import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import { Repository, Connection } from "typeorm";
import { School } from "../model/entities/school.entity";
import { ISchool } from "../model/interface/school.interface";
import { CreateSchoolDto } from "../model/dto/create-school.dto";
import { UpdateSchoolDto } from "../model/dto/update-school.dto";
import { Pagination } from "nestjs-typeorm-paginate";
import { editFileName } from "../../helpers/utils";
import { writeFileSync } from "fs";
import { User } from "src/user/model/entities/user.entity";
import { PaginationParams } from "src/helpers/params";
import { AssessmentsService } from "src/assessment/service/assessment.service";
import { Student } from "../../student/model/entities/student.entity";
import { paginateData } from "src/utils/paginate-data";
import { InternalServerError } from "src/utils/errors";

@Injectable()
export class SchoolService {
  constructor(
    @InjectRepository(School)
    private schoolRepository: Repository<School>,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectConnection()
    private connection: Connection,

    private assessmentService: AssessmentsService,
  ) {}

  async paginate(
    {
      page,
      limit,
      search,
      order,
      active,
      status,
      county,
      isCsv,
    }: PaginationParams,
    user: User,
  ): Promise<Pagination<School>> {
    const queryBuilder = this.schoolRepository
      .createQueryBuilder("School")
      .select(["School", "ESC_MUN.MUN_ID", "ESC_MUN.MUN_NOME"])
      .leftJoin("School.ESC_MUN", "ESC_MUN")
      .orderBy("School.ESC_NOME", order);

    if (status) {
      queryBuilder.andWhere("School.ESC_STATUS = :status", { status });
    }

    if (county) {
      queryBuilder.andWhere("ESC_MUN.MUN_ID = :countyId", { countyId: county });
    }

    if (user.USU_SPE.SPE_PER.PER_NOME !== "SAEV") {
      queryBuilder.andWhere("ESC_MUN.MUN_ID = :countyId", {
        countyId: user.USU_MUN.MUN_ID,
      });
    }

    if (user.USU_SPE.SPE_PER.PER_NOME === "Escola") {
      queryBuilder.andWhere("School.ESC_ID = :id", { id: user.USU_ESC.ESC_ID });
    }

    if (active !== null) {
      queryBuilder.andWhere("School.ESC_ATIVO = :active", { active });
    }

    if (search) {
      queryBuilder.andWhere("School.ESC_NOME like :search", {
        search: `%${search}%`,
      });
    }

    return await paginateData(page, limit, queryBuilder, isCsv);
  }

  async getSchoolsReport(paginationParams: PaginationParams, user: User) {
    const data = await this.paginate(paginationParams, user);

    const formattedData = await Promise.all(
      data.items.map(async (school) => {
        const { totalStudents } = await this.getTotalStudentsBySchool(
          school.ESC_ID,
        );
        const { totalGrouped } = await this.getTotalGroupedBySchool(
          school.ESC_ID,
        );

        return {
          ESC_ID: school.ESC_ID,
          ESC_NOME: school.ESC_NOME,
          ESC_INEP: school.ESC_INEP,
          ESC_ATIVO: school.ESC_ATIVO,
          ESC_STATUS: school.ESC_STATUS,
          ENTURMADOS: totalStudents
            ? Math.round((totalGrouped / totalStudents) * 100)
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

  async add(createSchoolDto: CreateSchoolDto, user: User) {
    await this.verifySchoolExists(createSchoolDto);

    const school = this.schoolRepository.create(createSchoolDto);
    try {
      return await this.schoolRepository.save(school, { data: user });
    } catch (e) {
      throw new InternalServerError();
    }
  }

  async findAll(user: User) {
    const paramsFake = {
      isCsv: true,
      county: null,
      active: 1,
    } as any;

    const data = await this.paginate(paramsFake, user);

    return data?.items;
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

  async findOneReport(id: string) {
    const school = await this.findOne(+id, ["ESC_TUR", "ESC_TUR.TUR_SER"]);

    const { totalUsers } = await this.getTotalUsersBySchool(school.ESC_ID);

    const { totalStudents } = await this.getTotalStudentsBySchool(
      school.ESC_ID,
    );

    const { totalGrouped } = await this.getTotalGroupedBySchool(school.ESC_ID);

    const totalTests = await this.assessmentService.getTests(id);

    const series = school?.ESC_TUR?.map((data) => data?.TUR_SER?.SER_ID).filter(
      (value, index, self) => index === self.findIndex((t) => value === t),
    );

    return {
      ESC_ID: school.ESC_ID,
      ESC_NOME: school.ESC_NOME,
      TOTAL_ENTURMADO: totalGrouped,
      TOTAL_ALUNOS: totalStudents,
      TOTAL_USUARIOS: totalUsers,
      totalTests,
      ENTURMADOS: !!totalGrouped
        ? Math.round((totalGrouped / totalStudents) * 100)
        : 0,
      SERIES: series?.length,
      INFREQUENCIA: 0,
    };
  }

  async findOne(id: number, relations = []): Promise<School> {
    const school = await this.schoolRepository.findOne({
      where: {
        ESC_ID: id,
      },
      relations,
    });

    if (!school) {
      throw new NotFoundException("Escola não encontrada");
    }

    return school;
  }

  async disableUsersBySchool(id: number): Promise<void> {
    const users = await this.userRepository.find({
      where: {
        USU_ESC: {
          ESC_ID: id,
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

  async findByTransfer(
    { page, limit, active, search }: PaginationParams,
    user: User,
  ) {
    const queryBuilder = this.schoolRepository
      .createQueryBuilder("School")
      .select(["School.ESC_ID", "School.ESC_NOME"])
      .orderBy("School.ESC_NOME", "ASC");

    if (user.USU_SPE.SPE_PER.PER_NOME !== "SAEV") {
      queryBuilder.andWhere("School.ESC_MUN = :county", {
        county: user?.USU_MUN?.MUN_ID,
      });
    }

    if (active !== null) {
      queryBuilder.andWhere("School.ESC_ATIVO = :active", { active });
    }

    if (search?.trim()) {
      queryBuilder.andWhere("School.ESC_NOME like :search", {
        search: `%${search}%`,
      });
    }

    return await paginateData(page, limit, queryBuilder);
  }

  /**
   *
   * @param id informação referente a identificação do município dentro da escola
   * @returns retorna o escola pesquisada
   */
  async findAllByCounty(countyId: number, user: User) {
    const paramsFake = {
      isCsv: true,
      county: countyId,
      active: 1,
    } as any;

    const data = await this.paginate(paramsFake, user);

    return data?.items;
  }

  async update(id: number, updateSchoolDto: UpdateSchoolDto, user: User) {
    const school = await this.findOne(id);

    if (
      school.ESC_ATIVO !== updateSchoolDto?.ESC_ATIVO &&
      user?.USU_SPE?.SPE_PER?.PER_NOME === "Escola"
    ) {
      throw new ForbiddenException(
        "Você não tem permissão para executar esta ação.",
      );
    }

    try {
      const schoolUpdate = await this.schoolRepository.save(
        { ...updateSchoolDto, ESC_ID: school.ESC_ID },
        { data: user },
      );

      if (!updateSchoolDto.ESC_ATIVO) {
        this.disableUsersBySchool(school.ESC_ID);
      }

      return schoolUpdate;
    } catch (e) {
      throw new InternalServerError();
    }
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

  private async verifySchoolExists({
    ESC_NOME,
    ESC_UF,
    ESC_CIDADE,
  }: CreateSchoolDto): Promise<void> {
    const school = await this.schoolRepository.findOne({
      ESC_NOME,
      ESC_UF,
      ESC_CIDADE,
    });

    if (school) {
      throw new ConflictException("Escola já cadastrada");
    }
  }

  private async getTotalUsersBySchool(id: number) {
    const totalUsers = await this.connection
      .getRepository(User)
      .count({ where: { USU_ESC: { ESC_ID: id } } });

    return {
      totalUsers,
    };
  }

  private async getTotalGroupedBySchool(schoolId: number) {
    const totalGrouped = await this.connection.getRepository(Student).count({
      where: {
        ALU_ESC: {
          ESC_ID: schoolId,
        },
        ALU_STATUS: "Enturmado",
        ALU_ATIVO: true,
      },
    });

    return {
      totalGrouped,
    };
  }

  private async getTotalStudentsBySchool(schoolId: number) {
    const totalStudents = await this.connection.getRepository(Student).count({
      where: {
        ALU_ESC: {
          ESC_ID: schoolId,
        },
        ALU_ATIVO: true,
      },
    });

    return {
      totalStudents,
    };
  }
}
