import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Test } from "../model/entities/test.entity";
import { CreateTestDto } from "../model/dto/create-test.dto";
import { UpdateTestDto } from "../model/dto/update-tests.dto";
import {
  Pagination,
  IPaginationOptions,
  paginateRaw,
} from "nestjs-typeorm-paginate";
import { TestTemplate } from "../model/entities/test-template.entity";
import { editFileName } from "src/helpers/utils";
import { writeFileSync } from "fs";
import { User } from "src/user/model/entities/user.entity";
import { Student } from "src/student/model/entities/student.entity";
import { GetTestHerby } from "../model/dto/get-test-herby";

@Injectable()
export class TestsService {
  constructor(
    @InjectRepository(Test)
    private testRepository: Repository<Test>,
    @InjectRepository(TestTemplate)
    private testTemplatesRepository: Repository<TestTemplate>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
  ) {}

  /**
   * Listagem de teste com paginação, ordenação e pesquisa por nome.
   *
   * @param options adicionar o limite e qual página estamos
   * @param search permitir pesquisa por um termo pelo nome do teste
   * @param order cria a ordenação para a listagem
   * @returns Retorna a lista paginada, ordenada e filtrada com os teste
   */
  async paginate(
    options: IPaginationOptions,
    search: string,
    column: string,
    orderBy: string,
  ): Promise<Pagination<Test>> {
    const queryBuilder = this.testRepository
      .createQueryBuilder("TESTE")
      .select([
        "TESTE.TES_ID",
        "TESTE.TES_NOME",
        "TES_DIS.DIS_NOME",
        "TES_SER.SER_NOME",
      ])
      .leftJoin("TESTE.TES_DIS", "TES_DIS")
      .leftJoin("TESTE.TES_SER", "TES_SER");

    const order: any = orderBy;
    switch (column) {
      case "TES_DIS_DIS_NOME":
        queryBuilder.orderBy("TES_DIS.DIS_NOME", order);
        break;
      case "TES_SER_SER_NOME":
        queryBuilder.orderBy("TES_SER.SER_NOME", order);
        break;
      default:
        queryBuilder.orderBy("TESTE.TES_NOME", order);
        break;
    }

    let strQuery = "";
    if (search) {
      search = search.replace("°", "º");
      strQuery = ` ( TESTE.TES_NOME LIKE '%${search}%' OR 
      TES_DIS.DIS_NOME LIKE '%${search}%' OR 
      TES_SER.SER_NOME LIKE '%${search}%' ) `;
    }

    queryBuilder.where(strQuery);
    return paginateRaw<Test>(queryBuilder, options);
  }

  /**
   *
   * @param id informação referente a identificação do teste
   * @param updateTestDto objeto referente a criação de teste
   * @returns informa que o teste foi atualizado
   */
  async update(
    TES_ID: number,
    updateTestDto: UpdateTestDto,
    user: User,
  ): Promise<Test> {
    let items = updateTestDto.TES_TEG;
    delete updateTestDto.TES_TEG;
    const test = await this.findOne(TES_ID);
    return this.testRepository
      .save({ ...updateTestDto, TES_ID }, { data: user })
      .then((updateTest: Test) => {
        updateTest = {
          ...updateTest,
          TES_TEG: test?.TES_TEG,
        };
        if (Array.isArray(items) && this.saveTemplates(updateTest, items)) {
          return updateTest;
        }
      });
  }

  async saveTemplates(updateTest: Test, items: TestTemplate[]) {
    for await (const oldTemplate of updateTest?.TES_TEG) {
      const existsTemplate = items.find(
        (template) => template?.TEG_ID === oldTemplate.TEG_ID,
      );

      if (!existsTemplate) {
        await this.testTemplatesRepository.remove(oldTemplate);
      }
    }

    return items?.map((template: TestTemplate) => {
      if (!template?.TEG_TES) {
        template = {
          ...template,
          TEG_TES: updateTest,
        };
      }
      this.testTemplatesRepository.save(template).then(() => {
        return template;
      });
    });
  }

  /**
   * Criar teste
   *
   * @param createTestDto objeto referente a criação de teste
   * @returns informa que o teste foi criado
   */
  add(createTestDto: CreateTestDto, user: User) {
    return this.testExists(createTestDto).then((exists: boolean) => {
      if (!exists) {
        return this.testRepository
          .save(createTestDto, { data: user })
          .then((createTest: Test) => {
            if (this.saveTemplates(createTest, createTest.TES_TEG)) {
              return createTest;
            }
          });
      } else {
        throw new HttpException("Teste já cadastrado.", HttpStatus.CONFLICT);
      }
    });
  }

  /**
   * Retorna todos os teste
   *
   * @returns retorna uma lista de teste
   */
  findAll(): Promise<Test[]> {
    return this.testRepository.find({
      order: { TES_NOME: "ASC" },
      relations: ["TES_DIS", "TES_SER", "TES_MAR"],
    });
  }

  /**
   * Retorna todos os teste por ano
   *
   * @returns retorna uma lista de teste
   */
  findYears(ano: string): Promise<Test[]> {
    return this.testRepository.find({
      order: { TES_NOME: "ASC" },
      where: { TES_ANO: ano },
      relations: ["TES_DIS", "TES_SER", "TES_MAR"],
    });
  }

  /**
   * Retorna todos os anos dos testes
   *
   * @returns retorna uma lista de teste
   */
  findAllYears(): Promise<Test[]> {
    return this.testRepository
      .createQueryBuilder("TESTE")
      .select("TESTE.TES_ANO AS ANO")
      .groupBy("TESTE.TES_ANO")
      .execute();
  }

  /**
   * Buscar um teste com base no id
   * @param id informação referente a identificação do teste
   * @returns retorna o teste pesquisado
   */
  async findOne(TES_ID: number) {
    let main = await this.testRepository.findOne(
      { TES_ID },
      { relations: ["TES_DIS", "TES_SER", "TES_MAR"] },
    );
    let getTemplates = await this.findTemplates(main.TES_ID);
    let templates = await Promise.all(
      getTemplates.map(async (template) => {
        return template;
      }),
    );

    main["TES_TEG"] = templates;
    return main;
  }

  async findOneByHerby(id: number, getTestHerby: GetTestHerby) {
    const { countyId, schoolId } = getTestHerby;

    const queryBuilder = this.testRepository
      .createQueryBuilder("test")
      .leftJoinAndSelect("test.TES_SER", "TES_SER")
      .leftJoinAndSelect("test.TES_DIS", "TES_DIS")
      .where("test.TES_ID = :id", { id });

    const test = await queryBuilder.getOne();

    const turnos = {
      1: "PRIMEIRO",
      2: "SEGUNDO",
      3: "TERCEIRO",
      4: "QUARTO",
      5: "QUINTO",
      6: "SEXTO",
      7: "SETIMO",
      8: "OITAVO",
      9: "NONO",
    } as const;

    const queryBuilderStudents = this.studentRepository
      .createQueryBuilder("student")
      .select([
        "student.ALU_ID",
        "student.ALU_NOME",
        "ALU_TUR.TUR_ID",
        "ALU_TUR.TUR_NOME",
        'ALU_TUR.TUR_PERIODO',
        'ALU_ESC.ESC_ID',
        'ALU_ESC.ESC_NOME',
        'ESC_MUN.MUN_ID',
        'ESC_MUN.MUN_NOME'
      ])
      .leftJoinAndSelect("student.ALU_ESC", "ALU_ESC")
      .leftJoinAndSelect("ALU_ESC.ESC_MUN", "ESC_MUN")
      .leftJoinAndSelect("student.ALU_TUR", "ALU_TUR")
      .andWhere("student.ALU_ATIVO = 1")
      .andWhere('student.ALU_TUR IS NOT NULL')
      .andWhere("student.ALU_SER_ID = :idSerie", { idSerie: test.TES_SER.SER_ID });


      if(countyId) {
        queryBuilderStudents.andWhere("ESC_MUN.MUN_ID = :countyId", { countyId })
      }

      if (schoolId) {
        queryBuilderStudents.andWhere("ALU_ESC.ESC_ID = :schoolId", {
          schoolId,
        });
      }

      const students = await queryBuilderStudents.getMany();

      const etapa = turnos[test.TES_SER.SER_NUMBER];

    const userUploadInfos = students.map((student) => {
      return {
        foreignStudentId: student.ALU_ID,
        studentName: student.ALU_NOME,
        foreignClassId: student?.ALU_TUR?.TUR_ID,
        className: student?.ALU_TUR?.TUR_NOME,
        turno: student?.ALU_TUR?.TUR_PERIODO.toUpperCase(),
        foreignSchoolId: student?.ALU_ESC?.ESC_ID,
        schoolName: student?.ALU_ESC?.ESC_NOME,
        foreignCityId: student?.ALU_ESC?.ESC_MUN?.MUN_ID,
        cityName: student?.ALU_ESC?.ESC_MUN?.MUN_NOME,
        etapa,
      };
    });

    const keys = {
      Matemática: "idProvaMt",
      Português: "idProvaPt",
      "Língua Portuguesa": "idProvaPt"
    } as const;

    const keyProva = keys[test.TES_DIS.DIS_NOME];

    if (!keyProva) {
      throw new ForbiddenException();
    }

    const formattedTest = {
      [keyProva]: test.TES_ID,
      userUploadInfos,
    };

    return formattedTest;
  }

  async findTemplates(TES_ID: number) {
    return this.testTemplatesRepository.find({
      where: { TEG_TES: { TES_ID: TES_ID } },
      relations: ["TEG_MTI"],
      order: { TEG_ORDEM: "ASC" },
    });
  }

  /**
   * Verificação se já existe o mesmo teste, com mesmo estado e cidade
   * @param TES_NOME nome do teste
   * @returns retorna o resultado da consulta como VERDADEIRO ou FALSO
   */
  async testExists(createTestDto: CreateTestDto): Promise<boolean> {
    const test = await this.testRepository.findOne({
      TES_NOME: createTestDto.TES_NOME,
      TES_DIS: createTestDto.TES_DIS,
      TES_SER: createTestDto.TES_SER,
      TES_ANO: createTestDto.TES_ANO,
    });
    if (test) {
      return true;
    } else {
      return false;
    }
  }

  async updateFile(
    TES_ID: number,
    filename: string,
    base64: string,
    user: User,
  ): Promise<string> {
    let test = await this.testRepository.findOne({ TES_ID: TES_ID });
    const folderName = "./public/test/file/";
    const newFileName = editFileName(filename);
    if (test) {
      test.TES_ARQUIVO = newFileName;
      writeFileSync(`${folderName}${newFileName}`, base64, {
        encoding: "base64",
      });
      await this.update(TES_ID, test, user);
      return newFileName;
    } else {
      throw new HttpException(
        "Não é possível gravar este arquivo.",
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async updateManual(
    TES_ID: number,
    filename: string,
    base64: string,
    user: User,
  ): Promise<string> {
    let test = await this.testRepository.findOne({ TES_ID: TES_ID });
    const folderName = "./public/test/manual/";
    const newFileName = editFileName(filename);
    if (test) {
      test.TES_MANUAL = newFileName;
      writeFileSync(`${folderName}${newFileName}`, base64, {
        encoding: "base64",
      });
      await this.update(TES_ID, test, user);
      return newFileName;
    } else {
      throw new HttpException(
        "Não é possível gravar este manual.",
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
