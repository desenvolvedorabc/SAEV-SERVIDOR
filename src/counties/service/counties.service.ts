import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import { Connection, In, Repository } from "typeorm";
import { County } from "../model/entities/county.entity";
import { ICounty } from "../model/interface/county.interface";
import { CreateCountyDto } from "../model/dto/create-county.dto";
import { UpdateCountyDto } from "../model/dto/update-county.dto";
import { Pagination } from "nestjs-typeorm-paginate";
import { writeFileSync } from "fs";
import { editFileName } from "../../helpers/utils";
import { User } from "src/user/model/entities/user.entity";
import { PaginationParams } from "src/helpers/params";
import { AssessmentsService } from "src/assessment/service/assessment.service";
import { Student } from "../../student/model/entities/student.entity";
import { Teacher } from "../../teacher/model/entities/teacher.entity";
import { paginateData } from "src/utils/paginate-data";
import { School } from "src/school/model/entities/school.entity";
import { InternalServerError } from "src/utils/errors";

@Injectable()
export class CountiesService {
  constructor(
    @InjectRepository(County)
    private countyRepository: Repository<County>,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectConnection()
    private readonly connection: Connection,

    private assessmentService: AssessmentsService,
  ) {}

  async paginate(
    {
      page,
      limit,
      search,
      column,
      active,
      order,
      status,
      isCsv,
    }: PaginationParams,
    user: User,
  ): Promise<Pagination<County>> {
    const queryBuilder = this.countyRepository
      .createQueryBuilder("Counties")
      .orderBy(`Counties.${column || "MUN_NOME"}`, order);

    if (status) {
      queryBuilder.andWhere("Counties.MUN_STATUS = :status", { status });
    }

    if (search) {
      queryBuilder.where("Counties.MUN_NOME LIKE :q", { q: `%${search}%` });
    }

    if (active !== null) {
      queryBuilder.andWhere("Counties.MUN_ATIVO = :active", { active });
    }

    if (user?.USU_SPE?.SPE_PER?.PER_NOME !== "SAEV") {
      queryBuilder.andWhere("Counties.MUN_ID = :id", {
        id: user.USU_MUN.MUN_ID,
      });
    }

    return await paginateData(page, limit, queryBuilder, isCsv);
  }

  async getCountiesReport(paginateParams: PaginationParams, user: User) {
    const data = await this.paginate(paginateParams, user);

    const calcStudentsByMun = await Promise.all(
      data.items.map(async (data) => {
        const { totalStudents, totalGrouped, totalSchools } =
          await this.getTotalStudentsAndGroupedAndSchoolsByCounty(data.MUN_ID);

        return {
          MUN_ID: data.MUN_ID,
          MUN_COD_IBGE: data.MUN_COD_IBGE,
          MUN_NOME: data.MUN_NOME,
          MUN_UF: data.MUN_UF,
          MUN_STATUS: data.MUN_STATUS,
          MUN_ATIVO: data.MUN_ATIVO,
          TOTAL_ESCOLAS: totalSchools,
          TOTAL_ALUNOS: totalStudents,
          ENTURMADOS: !!totalGrouped
            ? Math.round((totalGrouped / totalStudents) * 100)
            : 0,
        };
      }),
    );

    return {
      ...data,
      items: calcStudentsByMun,
    };
  }

  async add(createCountyDto: CreateCountyDto, user: User) {
    await this.verifyCountyExists(createCountyDto);

    const county = this.countyRepository.create(createCountyDto);

    try {
      return await this.countyRepository.save(county, {
        data: user,
      });
    } catch (e) {
      throw new InternalServerError();
    }
  }

  async findAll(user: User): Promise<ICounty[]> {
    const fakeParams = {
      active: 1,
      isCsv: true,
    } as any;

    const data = await this.paginate(fakeParams, user);

    return data?.items;
  }

  async findOneReport(id: number) {
    const county = await this.findOne(id);

    const totalTeachers = await this.connection
      .getRepository(Teacher)
      .count({ where: { PRO_MUN: { MUN_ID: county.MUN_ID } } });

    const totalUsers = await this.connection
      .getRepository(User)
      .count({ where: { USU_MUN: { MUN_ID: county.MUN_ID } } });

    const { totalStudents, totalGrouped, totalSchools } =
      await this.getTotalStudentsAndGroupedAndSchoolsByCounty(id);

    let totalTests = await this.assessmentService.getTests(null, id);

    return {
      ...county,
      TOTAL_PROFESSORES: totalTeachers,
      TOTAL_USUARIOS: totalUsers,
      TOTAL_ALUNOS: totalStudents,
      TOTAL_ESCOLAS: totalSchools,
      totalTests,
      ENTURMADOS: totalGrouped
        ? Math.round((totalGrouped / totalStudents) * 100)
        : 0,
      INFREQUENCIA: 0,
    };
  }

  async findOne(id: number): Promise<County> {
    const county = await this.countyRepository.findOne({
      where: {
        MUN_ID: id,
      },
    });

    if (!county) {
      throw new NotFoundException("Município não encontrado.");
    }

    return county;
  }

  async update(
    id: number,
    updateCountyDto: UpdateCountyDto,
    user: User,
  ): Promise<ICounty> {
    const county = await this.findOne(id);

    if (
      county?.MUN_ATIVO !== updateCountyDto?.MUN_ATIVO &&
      user?.USU_SPE?.SPE_PER?.PER_NOME !== "SAEV"
    ) {
      throw new ForbiddenException(
        "Você não tem permissão para executar esta ação.",
      );
    }

    try {
      const countyUpdate = await this.countyRepository.save(
        { ...updateCountyDto, MUN_ID: county.MUN_ID },
        { data: user },
      );

      if (!countyUpdate.MUN_ATIVO) {
        this.disableUsersByCounty(county?.MUN_ID);
      }

      return countyUpdate;
    } catch (e) {
      throw new InternalServerError();
    }
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

  async verifyCountyExists({
    MUN_NOME,
    MUN_UF,
    MUN_CIDADE,
  }: CreateCountyDto): Promise<void> {
    const county = await this.countyRepository.findOne({
      MUN_NOME,
      MUN_UF,
      MUN_CIDADE,
    });

    if (county) {
      throw new ConflictException("Município já cadastrado.");
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

  private async getTotalStudentsAndGroupedAndSchoolsByCounty(countyId: number) {
    const schools = await this.connection.getRepository(School).find({
      where: {
        ESC_MUN: {
          MUN_ID: countyId,
        },
      },
      select: ["ESC_ID"],
    });

    const totalStudents = await this.connection.getRepository(Student).count({
      where: {
        ALU_ESC: {
          ESC_ID: In(schools.map((school) => school.ESC_ID)),
        },
        ALU_ATIVO: true,
      },
    });

    const totalGrouped = await this.connection.getRepository(Student).count({
      where: {
        ALU_ESC: {
          ESC_ID: In(schools.map((school) => school.ESC_ID)),
        },
        ALU_STATUS: "Enturmado",
        ALU_ATIVO: true,
      },
    });

    return {
      totalStudents,
      totalGrouped,
      totalSchools: schools.length,
    };
  }
}
