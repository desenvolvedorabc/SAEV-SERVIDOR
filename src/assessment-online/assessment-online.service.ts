import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateAssessmentOnlineDto } from "./dto/create-assessment-online.dto";
import { UpdateAssessmentOnlineDto } from "./dto/update-assessment-online.dto";
import { Connection, Repository } from "typeorm";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import { Test } from "src/test/model/entities/test.entity";
import { AssessmentOnline } from "./entities/assessment-online.entity";
import { AssessmentOnlineQuestion } from "./entities/assessment-online-question.entity";
import { AssessmentOnlineQuestionAlternative } from "./entities/assessment-online-question-alternative.entity";
import { AssessmentOnlinePage } from "./entities/assessment-online-page.entity";
import { StudentTest } from "src/release-results/model/entities/student-test.entity";
import { unlink } from "node:fs";
import { PaginationParams } from "src/helpers/params";
import { Student } from "src/student/model/entities/student.entity";
import { User } from "src/user/model/entities/user.entity";
import { paginateData } from "src/utils/paginate-data";
import { InternalServerError } from "src/utils/errors";

@Injectable()
export class AssessmentOnlineService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,

    @InjectRepository(AssessmentOnline)
    private readonly assessmentOnline: Repository<AssessmentOnline>,

    @InjectRepository(AssessmentOnlineQuestion)
    private readonly assessmentOnlineQuestion: Repository<AssessmentOnlineQuestion>,

    @InjectRepository(AssessmentOnlinePage)
    private readonly assessmentOnlinePage: Repository<AssessmentOnlinePage>,
  ) {}

  async create(createAssessmentOnlineDto: CreateAssessmentOnlineDto) {
    const { testId, pages } = createAssessmentOnlineDto;
    const test = await this.connection.getRepository(Test).findOne({
      where: {
        TES_ID: testId,
      },
      relations: ["TEMPLATE_TEST", "assessmentOnline"],
    });

    if (!test) {
      throw new NotFoundException("Teste não encontrado");
    }

    const verifyQuestions = [];

    pages.forEach((page) => {
      verifyQuestions.push(...page.questions);
    });

    if (test?.assessmentOnline) {
      throw new ForbiddenException(
        "Já existe uma avaliação cadastrada para este teste.",
      );
    }

    if (test.TEMPLATE_TEST.length !== verifyQuestions.length) {
      throw new ForbiddenException(
        "Informe a mesma quantidade de questões existente no gabarito do teste.",
      );
    }

    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let assessmentOnline = this.assessmentOnline.create({
      test,
    });

    try {
      await queryRunner.manager.save(AssessmentOnline, assessmentOnline);

      for (const page of pages) {
        const savePage = {
          assessmentOnline,
          image: page.image,
          order: page.order,
          title: page.title,
        };

        await queryRunner.manager.save(AssessmentOnlinePage, savePage);

        for (const question of page.questions) {
          const questionTemplate = test.TEMPLATE_TEST.find(
            (template) => template.TEG_ORDEM === question.order,
          );

          const saveQuestion = {
            page: savePage,
            description: question.description,
            order: question.order,
            questionTemplate,
          };

          await queryRunner.manager.save(
            AssessmentOnlineQuestion,
            saveQuestion,
          );

          for (const alternative of question.alternatives) {
            const saveAlternative = {
              description: alternative.description,
              option: alternative.option?.toUpperCase(),
              question: saveQuestion,
              image: alternative.image,
            };
            await queryRunner.manager.save(
              AssessmentOnlineQuestionAlternative,
              saveAlternative,
            );
          }
        }
      }

      await queryRunner.commitTransaction();

      return {
        assessmentOnline,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerError();
    } finally {
      await queryRunner.release();
    }
  }

  async findOne(
    id: number,
    relations = [
      "test",
      'test.TEMPLATE_TEST',
      "pages",
      "pages.questions",
      "pages.questions.alternatives",
    ],
  ) {
    const assessmentOnline = await this.assessmentOnline.findOne({
      where: {
        id,
      },
      relations,
    });

    if (!assessmentOnline) {
      throw new NotFoundException("Teste não encontrado");
    }

    return {
      assessmentOnline,
    };
  }

  async update(id: number, updateAssessmentDto: UpdateAssessmentOnlineDto) {
    const { pages } = updateAssessmentDto;
    const { assessmentOnline } = await this.findOne(id, [
      "test",
      "test.TEMPLATE_TEST",
    ]);

    await this.verifyStudentInTest(assessmentOnline.test.TES_ID);

    const test = assessmentOnline.test;

    const verifyQuestions = [];

    pages.forEach((page) => {
      verifyQuestions.push(...page.questions);
    });

    if (test.TEMPLATE_TEST.length !== verifyQuestions.length) {
      throw new ForbiddenException(
        "Informe a mesma quantidade de questões existente no gabarito do teste.",
      );
    }

    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const page of pages) {
        let questions = page.questions;

        delete page.questions;

        const savePage = {
          assessmentOnline,
          ...page,
        };

        await queryRunner.manager.save(AssessmentOnlinePage, savePage);

        for (const question of questions) {
          let alternatives = question.alternatives;

          delete question.alternatives;
          const questionTemplate = test.TEMPLATE_TEST.find(
            (template) => template.TEG_ORDEM === question.order,
          );

          const saveQuestion = {
            page: savePage,
            questionTemplate,
            ...question,
          };

          await queryRunner.manager.save(
            AssessmentOnlineQuestion,
            saveQuestion,
          );

          for (const alternative of alternatives) {
            const saveAlternative = {
              question: saveQuestion,
              ...alternative,
            };

            await queryRunner.manager.save(
              AssessmentOnlineQuestionAlternative,
              saveAlternative,
            );
          }
        }
      }

      await queryRunner.commitTransaction();

      return {
        assessmentOnline,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerError();
    } finally {
      await queryRunner.release();
    }
  }

  async toggleActive(id: number): Promise<{
    active: boolean;
  }> {
    const { assessmentOnline } = await this.findOne(id, ["test"]);

    if (!assessmentOnline.active && !assessmentOnline.test.TES_ATIVO) {
      throw new ForbiddenException();
    }

    if (assessmentOnline.active) {
      await this.verifyStudentInTest(assessmentOnline.test.TES_ID);
    }

    const toggleActive = !assessmentOnline.active;

    try {
      await this.assessmentOnline.update(id, {
        active: toggleActive,
      });
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

  async deleteQuestion(id: number): Promise<void> {
    const question = await this.assessmentOnlineQuestion.findOne({
      where: {
        id,
      },
      relations: [
        "alternatives",
        "page",
        "page.assessmentOnline",
        "page.assessmentOnline.test",
      ],
    });

    if (!question) {
      throw new NotFoundException();
    }

    await this.verifyStudentInTest(question.page.assessmentOnline.test.TES_ID);

    const images = [];

    question.alternatives.forEach((alternative) => {
      if (alternative.image) {
        images.push(alternative.image);
      }
    });

    try {
      await this.assessmentOnlineQuestion.delete(id);

      images.forEach((imageUrl) => {
        this.deleteImageUrl(imageUrl);
      });
    } catch (e) {
      throw new InternalServerError();
    }
  }

  async deletePage(id: number): Promise<void> {
    const page = await this.assessmentOnlinePage.findOne({
      where: {
        id,
      },
      relations: [
        "assessmentOnline",
        "assessmentOnline.test",
        "questions",
        "questions.alternatives",
      ],
    });

    if (!page) {
      throw new NotFoundException();
    }

    await this.verifyStudentInTest(page.assessmentOnline.test.TES_ID);

    const images = [];

    if (page.image) {
      images.push(page.image);
    }

    page.questions.forEach((question) => {
      question.alternatives.forEach((alternative) => {
        if (alternative.image) {
          images.push(alternative.image);
        }
      });
    });

    try {
      await this.assessmentOnlinePage.delete(id);

      images.forEach((imageUrl) => {
        this.deleteImageUrl(imageUrl);
      });
    } catch (e) {
      throw new InternalServerError();
    }
  }

  private deleteImageUrl(imageUrl: string) {
    unlink(`./public/assessment/${imageUrl}`, (err) => {
      console.log(err);
    });
  }

  async getStudentsForAssessmentOnline(
    testId: number,
    params: PaginationParams,
    user: User,
  ) {
    const { schoolClass, page, limit, search } = params;

    const { assessmentOnline } = await this.findOne(testId, ["test"]);

    if (!assessmentOnline.active) {
      throw new BadRequestException();
    }

    const test = assessmentOnline.test;

    const queryBuilder = this.connection
      .getRepository(Student)
      .createQueryBuilder("Student")
      .select([
        "Student.ALU_ID",
        "Student.ALU_NOME",
        "Student.ALU_INEP",
      ])
      .innerJoin("Student.ALU_TUR", "ALU_TUR")
      .andWhere("Student.ALU_ATIVO = TRUE")
      .andWhere("Student.ALU_ESC = :school", { school: user?.USU_ESC?.ESC_ID })
      .andWhere("Student.ALU_SER = :serie", { serie: test.TES_SER.SER_ID })
      .orderBy("Student.ALU_NOME", "ASC");

    if (schoolClass) {
      queryBuilder.andWhere("Student.ALU_TUR = :schoolClass", { schoolClass });
    }

    if (search) {
      queryBuilder.andWhere("Student.ALU_NOME LIKE :q", {
        q: `%${search}%`,
      });
    }

    const data = await paginateData<Student>(+page, +limit, queryBuilder)

    const students = await Promise.all(data.items.map(async (student) => {
      const isAvailable = await this.verifyStudentExistsInTest(student.ALU_ID, test.TES_ID)

      return {
        ...student,
        isAvailable
      }
    }))

    return {
      ...data,
      items: students
    }
  }

  async verifyStudentExistsInTest(
    studentId: number,
    testId: number,
  ) {
    const verify = await this.connection
      .getRepository(StudentTest)
      .createQueryBuilder("StudentTest")
      .where("StudentTest.ALT_ALU = :studentId", { studentId })
      .andWhere("StudentTest.ALT_TES = :testId", { testId })
      .getOne();

    return !verify;
  }
}
