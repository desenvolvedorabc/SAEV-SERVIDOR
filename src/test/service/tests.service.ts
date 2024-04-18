import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import { Connection, Repository } from "typeorm";
import * as _ from "lodash";
import { Test } from "../model/entities/test.entity";
import { CreateTestDto } from "../model/dto/create-test.dto";
import { UpdateTestDto } from "../model/dto/update-tests.dto";
import {
  Pagination,
  paginateRaw,
} from "nestjs-typeorm-paginate";
import { TestTemplate } from "../model/entities/test-template.entity";
import { editFileName } from "src/helpers/utils";
import { writeFileSync } from "fs";
import { User } from "src/user/model/entities/user.entity";
import { Student } from "src/student/model/entities/student.entity";
import { GetTestHerby } from "../model/dto/get-test-herby";
import { ConfigService } from "@nestjs/config";
import { StudentTest } from "src/release-results/model/entities/student-test.entity";
import { AssessmentOnline } from "src/assessment-online/entities/assessment-online.entity";
import { PaginationParams } from "src/helpers/params";
import { InternalServerError } from "src/utils/errors";
import { paginateData } from "src/utils/paginate-data";
import { StudentTestAnswer } from "src/release-results/model/entities/student-test-answer.entity";
import { serieNames, serieNumbers } from "../constants/series";
import {
  mapperTestsWithAssessmentOnline,
  mapperUsersUploadInfoByHerby,
} from "../mappers";

@Injectable()
export class TestsService {
  constructor(
    @InjectRepository(Test)
    private testRepository: Repository<Test>,
    @InjectRepository(TestTemplate)
    private testTemplatesRepository: Repository<TestTemplate>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(StudentTestAnswer)
    private studentTestAnswerRepository: Repository<StudentTestAnswer>,

    @InjectConnection()
    private readonly connection: Connection,

    private configService: ConfigService,
  ) {}

  async paginate({
    page,
    limit,
    order,
    search,
    column,
    serie,
    year,
    subject,
  }: PaginationParams): Promise<Pagination<Test>> {
    const queryBuilder = this.testRepository
      .createQueryBuilder("TESTE")
      .select([
        "TESTE.TES_ID",
        "TESTE.TES_NOME",
        "TESTE.TES_ANO",
        "TES_DIS.DIS_NOME",
        "TES_SER.SER_NOME",
      ])
      .leftJoin("TESTE.TES_DIS", "TES_DIS")
      .leftJoin("TESTE.TES_SER", "TES_SER")
      .orderBy(column ?? "TESTE.TES_NOME", order);

    if (year) {
      queryBuilder.andWhere("TESTE.TES_ANO = :year", { year });
    }

    if (serie) {
      queryBuilder.andWhere("TES_SER.SER_ID = :serie", { serie });
    }

    if (subject) {
      queryBuilder.andWhere("TES_DIS.DIS_ID = :subject", { subject });
    }

    if (search) {
      queryBuilder.andWhere(
        "(TESTE.TES_NOME LIKE :search OR TES_DIS.DIS_NOME LIKE :search OR TES_SER.SER_NOME LIKE :search)",
        { search: `%${search}%` },
      );
    }

    return paginateRaw<Test>(queryBuilder, { page, limit });
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

  async toggleActive(id: number): Promise<{
    active: boolean;
  }> {
    const test = await this.findOne(id, ["assessmentOnline"]);

    if (test.TES_ATIVO) {
      await this.verifyStudentInTest(id);
    }

    const toggleActive = !test.TES_ATIVO;

    try {
      await this.testRepository.save({
        ...test,
        TES_ATIVO: toggleActive,
      });
      if (!toggleActive && test?.assessmentOnline) {
        await this.connection
          .getRepository(AssessmentOnline)
          .update(test.assessmentOnline.id, {
            active: false,
          });
      }
    } catch (e) {
      throw new InternalServerError();
    }

    return {
      active: toggleActive,
    };
  }

  async verifyStudentInTest(testId: number): Promise<void> {
    const verifyStudent = await this.connection
      .getRepository(StudentTest)
      .findOne({
        where: {
          ALT_TES: {
            TES_ID: testId,
          },
        },
      });

    if (verifyStudent) {
      throw new ForbiddenException(
        "Você não pode executar esta ação no momento. Pois a avaliação ja está em uso.",
      );
    }
  }

  async saveTemplates(updateTest: Test, items: TestTemplate[]) {
    for await (const oldTemplate of updateTest?.TES_TEG) {
      const existsTemplate = items.find(
        (template) => template?.TEG_ID === oldTemplate.TEG_ID,
      );

      if (!existsTemplate) {
        await this.testTemplatesRepository.delete(oldTemplate.TEG_ID);
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

  async add(createTestDto: CreateTestDto, user: User) {
    await this.verifyTestExists(createTestDto);

    try {
      return this.testRepository
        .save(createTestDto, { data: user })
        .then((createTest: Test) => {
          if (this.saveTemplates(createTest, createTest.TES_TEG)) {
            return createTest;
          }
        });
    } catch (e) {
      throw new InternalServerError();
    }
  }

  /**
   * Buscar um teste com base no id
   * @param id informação referente a identificação do teste
   * @returns retorna o teste pesquisado
   */
  async findOne(
    id: number,
    relations = ["TES_DIS", "TES_SER", "TES_MAR", "assessmentOnline"],
  ) {
    let test = await this.testRepository.findOne({ TES_ID: id }, { relations });

    if (!test) {
      throw new NotFoundException("Teste não encontrado.");
    }

    let getTemplates = await this.findTemplates(test.TES_ID);
    let templates = await Promise.all(
      getTemplates.map(async (template) => {
        return template;
      }),
    );

    test["TES_TEG"] = templates;
    return test;
  }

   /**
   * Retorna todos os teste por ano
   *
   * @returns retorna uma lista de teste
   */
   async findYears(ano: string): Promise<Test[]> {
    const tests = await this.testRepository
      .createQueryBuilder("Test")
      .innerJoinAndSelect("Test.TES_DIS", "TES_DIS")
      .leftJoin("Test.TES_ASSESMENTS", "TES_ASSESMENTS")
      .where("Test.TES_ANO = :year", { year: ano })
      .andWhere("Test.TES_ATIVO = TRUE")
      .andWhere("TES_ASSESMENTS.AVA_ID IS NULL")
      .orderBy("Test.TES_NOME", "ASC")
      .getMany();

    return tests;
  }

  async findOneByHerby(id: number, getTestHerby: GetTestHerby) {
    const { countyId, schoolId } = getTestHerby;

    const test = await this.findOne(id);

    const { students } = await this.getManyStudentsForReleaseTests(
      test.TES_SER.SER_ID,
      countyId,
      schoolId,
    );

    const serie = serieNames[test.TES_SER.SER_NUMBER];

    const { userUploadInfos } = mapperUsersUploadInfoByHerby(students, serie);

    const keys = {
      Matemática: "idProvaMt",
      Português: "idProvaPt",
      "Língua Portuguesa": "idProvaPt",
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

  async findOneByEdler(id: number, getTestHerby: GetTestHerby) {
    const { countyId, schoolId } = getTestHerby;

    const test = await this.findOne(id);

    const { students } = await this.getManyStudentsForReleaseTests(
      test.TES_SER.SER_ID,
      countyId,
      schoolId,
    );

    const serie = serieNumbers[test.TES_SER.SER_NUMBER];

    const dataGroupped = _.groupBy(
      students,
      (student) => student?.ALU_TUR?.TUR_ID,
    );

    const keyTurmas = Object.keys(dataGroupped);

    const classes = keyTurmas.map((key) => {
      const student = dataGroupped[key][0];

      const students = dataGroupped[key].map((line) => {
        return {
          foreignId: String(line.ALU_ID),
          name: line.ALU_NOME,
        };
      });

      return {
        className: student?.ALU_TUR?.TUR_NOME,
        schoolName: student?.ALU_ESC?.ESC_NOME,
        cityName: student?.ALU_ESC?.ESC_MUN?.MUN_NOME,
        grade: serie,
        foreignClassId: String(student?.ALU_TUR?.TUR_ID),
        foreignSchoolId: String(student?.ALU_ESC?.ESC_ID),
        foreignCityId: String(student?.ALU_ESC?.ESC_MUN?.MUN_ID),
        students,
      };
    });

    const formattedTest = {
      userId: this.configService.get<string>("USER_SAEV_EDLER"),
      testId: String(test.TES_ID),
      classes,
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

  async verifyTestExists(createTestDto: CreateTestDto) {
    const test = await this.testRepository.findOne({
      TES_NOME: createTestDto.TES_NOME,
      TES_DIS: createTestDto.TES_DIS,
      TES_SER: createTestDto.TES_SER,
      TES_ANO: createTestDto.TES_ANO,
    });

    if (test) {
      throw new ConflictException("Teste já cadastrado.");
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

  async getTestsWithAssessmentOnline(
    paginationParams: PaginationParams,
    user: User,
  ) {
    const { limit, page, search, serie } = paginationParams;

    const formattedInitialDate = new Date();
    formattedInitialDate.setUTCHours(23, 59, 59, 999);

    const finalDate = new Date();

    const queryBuilder = this.testRepository
      .createQueryBuilder("Tests")
      .select([
        "Tests",
        "assessmentOnline.id",
        "TES_ASSESMENTS.AVA_ID",
        "TES_SER.SER_ID",
        "TES_SER.SER_NOME",
        "TES_DIS.DIS_ID",
        "TES_DIS.DIS_NOME",
      ])
      .innerJoin("Tests.TES_ASSESMENTS", "TES_ASSESMENTS")
      .innerJoin("Tests.assessmentOnline", "assessmentOnline")
      .innerJoin("Tests.TES_SER", "TES_SER")
      .innerJoin("Tests.TES_DIS", "TES_DIS")
      .innerJoinAndSelect("TES_ASSESMENTS.AVA_AVM", "AVA_AVM")
      .innerJoinAndSelect("AVA_AVM.AVM_MUN", "AVM_MUN")
      .andWhere(
        "DATE_SUB(AVA_AVM.AVM_DT_INICIO, INTERVAL 3 HOUR) <= :initialDate",
        { initialDate: formattedInitialDate },
      )
      .andWhere("DATE_SUB(AVA_AVM.AVM_DT_FIM, INTERVAL 3 HOUR) >= :finalDate", {
        finalDate,
      })
      .andWhere("Tests.TES_ATIVO = TRUE")
      .andWhere("assessmentOnline.active = TRUE")
      .andWhere("AVM_MUN.MUN_ID = :county", { county: user?.USU_MUN?.MUN_ID })
      .orderBy("Tests.TES_DT_CRIACAO", "DESC");

    if (serie) {
      queryBuilder.andWhere("TES_SER.SER_ID = :serie", { serie });
    }

    if (search) {
      queryBuilder.andWhere("Tests.TES_NOME LIKE :q", {
        q: `%${search}%`,
      });
    }

    const data = await paginateData(page, limit, queryBuilder);

    const { items } = mapperTestsWithAssessmentOnline(data.items);

    return {
      ...data,
      items,
    };
  }

  async findOneQuestion(questionId: number) {
    const question = await this.testTemplatesRepository.findOne({
      where: {
        TEG_ID: questionId,
      },
    });

    if (!question) {
      throw new NotFoundException();
    }

    return {
      question,
    };
  }

  async deleteQuestion(questionId: number) {
    const { question } = await this.findOneQuestion(questionId);

    const studentTestAnswer = await this.studentTestAnswerRepository.findOne({
      where: {
        questionTemplate: question.TEG_ID,
      },
    });

    if (studentTestAnswer) {
      throw new ForbiddenException(
        "Você não pode deletar essa questão pois está em uso.",
      );
    }

    return {
      verify: true,
    };
  }

  async getManyStudentsForReleaseTests(
    serieId: number,
    countyId: number | null,
    schoolId: number | null,
  ) {
    const queryBuilderStudents = this.studentRepository
      .createQueryBuilder("Students")
      .select([
        "Students.ALU_ID",
        "Students.ALU_NOME",
        "ALU_TUR.TUR_ID",
        "ALU_TUR.TUR_NOME",
        "ALU_TUR.TUR_PERIODO",
        "ALU_ESC.ESC_ID",
        "ALU_ESC.ESC_NOME",
        "ESC_MUN.MUN_ID",
        "ESC_MUN.MUN_NOME",
      ])
      .leftJoin("Students.ALU_ESC", "ALU_ESC")
      .leftJoin("ALU_ESC.ESC_MUN", "ESC_MUN")
      .leftJoin("Students.ALU_TUR", "ALU_TUR")
      .andWhere("Students.ALU_ATIVO = 1")
      .andWhere("Students.ALU_TUR IS NOT NULL")
      .andWhere("Students.ALU_SER_ID = :serieId", {
        serieId,
      });

    if (countyId) {
      queryBuilderStudents.andWhere("ESC_MUN.MUN_ID = :countyId", { countyId });
    }

    if (schoolId) {
      queryBuilderStudents.andWhere("ALU_ESC.ESC_ID = :schoolId", {
        schoolId,
      });
    }

    const students = await queryBuilderStudents.getMany();

    return {
      students,
    };
  }
}
