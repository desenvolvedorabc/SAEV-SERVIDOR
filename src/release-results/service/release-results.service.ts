import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IPaginationOptions, paginateRaw } from "nestjs-typeorm-paginate";
import { Assessment } from "src/assessment/model/entities/assessment.entity";
import { Student } from "src/student/model/entities/student.entity";
import { TestTemplate } from "src/test/model/entities/test-template.entity";
import { Test } from "src/test/model/entities/test.entity";
import { User } from "src/user/model/entities/user.entity";
import { Repository } from "typeorm";
import {
  CreateStudentsTestsAnswersDto,
  CreateStudentsTestsDto,
} from "../model/dto/create-students-tests.dto";
import { StudentTestAnswer } from "../model/entities/student-test-answer.entity";
import { StudentTest } from "../model/entities/student-test.entity";
import { InternalServerError } from "src/utils/errors";

@Injectable()
export class ReleaseResultsService {
  constructor(
    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,
    @InjectRepository(Test)
    private testRepository: Repository<Test>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(StudentTest)
    private studentTestRepository: Repository<StudentTest>,
    @InjectRepository(TestTemplate)
    private testTemplateRepository: Repository<TestTemplate>,
    @InjectRepository(StudentTestAnswer)
    private studentsTestsAnswersEntity: Repository<StudentTestAnswer>,
  ) {}

  async add(createStudentsTestsDto: CreateStudentsTestsDto, user: User) {
    const idTest = JSON.parse(
      JSON.stringify(createStudentsTestsDto["ALT_TES"]),
    );
    const idStudent = JSON.parse(
      JSON.stringify(createStudentsTestsDto["ALT_ALU"]),
    );
    const altId = await this.findTestsExisting(idTest, idStudent);

    const student = await this.studentRepository.findOne({
      where: {
        ALU_ID: Number(idStudent)
      },
      relations: ['ALU_TUR']
    })

      if (altId) {
        const { ALT_ID } = altId;

        return this.studentTestRepository
          .save({ ...createStudentsTestsDto, schoolClass: student?.ALU_TUR, ALT_ID }, { data: user })
          .then((createdStudentTest: StudentTest) => {
            if (this.saveItems(createStudentsTestsDto, createdStudentTest)) {
              return createdStudentTest;
            }
          })
          .catch((e) => {
            throw new InternalServerError();
          });
      }
      return this.studentTestRepository
        .save({...createStudentsTestsDto, schoolClass: student?.ALU_TUR}, { data: user })
        .then((createdStudentTest: StudentTest) => {
          if (this.saveItems(createStudentsTestsDto, createdStudentTest)) {
            return createdStudentTest;
          }
        })
        .catch((e) => {
          throw new InternalServerError();
        });
  
  }

  async addByAssessmentOnline(createStudentsTestsDto: CreateStudentsTestsDto, user: User) {
    const idTest = JSON.parse(
      JSON.stringify(createStudentsTestsDto["ALT_TES"]),
    );
    const idStudent = JSON.parse(
      JSON.stringify(createStudentsTestsDto["ALT_ALU"]),
    );

    const test = await this.findTestTemplate(idTest);

    if(test?.length !== createStudentsTestsDto?.ALT_RESPOSTAS?.length) {
      throw new BadRequestException('Informe a quantidade de questões existentes na prova.')
    }

    const altId = await this.findTestsExisting(idTest, idStudent);

    const student = await this.studentRepository.findOne({
      where: {
        ALU_ID: Number(idStudent)
      },
      relations: ['ALU_TUR']
    })

      if (altId) {
        const { ALT_ID } = altId;

        return this.studentTestRepository
          .save(
            {
              ...createStudentsTestsDto,
              schoolClass: student?.ALU_TUR,
              ALT_ID,
              ALT_BY_AVA_ONLINE: true,
              ALT_JUSTIFICATIVA: null,
              ALT_ATIVO: true,
              ALT_FINALIZADO: true,
            },
            { data: user },
          )
          .then((createdStudentTest: StudentTest) => {
            if (this.saveItems(createStudentsTestsDto, createdStudentTest)) {
              return createdStudentTest;
            }
          })
          .catch((e) => {
            throw new InternalServerError();
          });
      }
      return this.studentTestRepository
        .save(
          {
            ...createStudentsTestsDto,
            schoolClass: student?.ALU_TUR,
            ALT_BY_AVA_ONLINE: true,
            ALT_JUSTIFICATIVA: null,
            ALT_ATIVO: true,
            ALT_FINALIZADO: true,
          },
          { data: user },
        )
        .then((createdStudentTest: StudentTest) => {
          if (this.saveItems(createStudentsTestsDto, createdStudentTest)) {
            return createdStudentTest;
          }
        })
        .catch((e) => {
          throw new InternalServerError();
        });
  
  }

  async addByHerby(createStudentsTestsDto: CreateStudentsTestsDto) {
    const idTest = JSON.parse(
      JSON.stringify(createStudentsTestsDto["ALT_TES"]),
    );
    const idStudent = JSON.parse(
      JSON.stringify(createStudentsTestsDto["ALT_ALU"]),
    );
    const altId = await this.findTestsExisting(idTest, idStudent);

    const student = await this.studentRepository.findOne({
      where: {
        ALU_ID: Number(idStudent)
      },
      relations: ['ALU_TUR']
    })

      if (altId) {
        const { ALT_ID } = altId;
        return this.studentTestRepository
          .save({ ...createStudentsTestsDto, schoolClass: student?.ALU_TUR, ALT_ID, ALT_BY_HERBY: true })
          .then((createdStudentTest: StudentTest) => {
            if (this.saveItems(createStudentsTestsDto, createdStudentTest)) {
              return createdStudentTest;
            }
          })
          .catch((e) => {
            throw new InternalServerError();
          });
      }
      return this.studentTestRepository
        .save({
          ...createStudentsTestsDto,
          schoolClass: student?.ALU_TUR,
          ALT_BY_HERBY: true,
        })
        .then((createdStudentTest: StudentTest) => {
          if (this.saveItems(createStudentsTestsDto, createdStudentTest)) {
            return createdStudentTest;
          }
        })
        .catch((e) => {
          throw new InternalServerError();
        });
   
  }

  async addByEdler(createStudentsTestsDto: CreateStudentsTestsDto) {
    const idTest = JSON.parse(
      JSON.stringify(createStudentsTestsDto["ALT_TES"]),
    );
    const idStudent = JSON.parse(
      JSON.stringify(createStudentsTestsDto["ALT_ALU"]),
    );
    const altId = await this.findTestsExisting(idTest, idStudent);

    const student = await this.studentRepository.findOne({
      where: {
        ALU_ID: Number(idStudent)
      },
      relations: ['ALU_TUR']
    })

    let formattedCreateStudentsTestsDto = {
      ...createStudentsTestsDto,
    }

    if(createStudentsTestsDto.ALT_RESPOSTAS.length) {
      formattedCreateStudentsTestsDto.ALT_JUSTIFICATIVA = null;
      formattedCreateStudentsTestsDto.ALT_FINALIZADO = true;
    }

      if (altId) {
        const { ALT_ID } = altId;
        return this.studentTestRepository
          .save({ ...formattedCreateStudentsTestsDto, schoolClass: student?.ALU_TUR, ALT_ID, ALT_BY_EDLER: true })
          .then((createdStudentTest: StudentTest) => {
            if (this.saveItemsEdler(formattedCreateStudentsTestsDto, createdStudentTest)) {
              return createdStudentTest;
            }
          })
          .catch((e) => {
            throw new InternalServerError();
          });
      }
      return this.studentTestRepository
        .save({
          ...formattedCreateStudentsTestsDto,
          schoolClass: student?.ALU_TUR,
          ALT_BY_EDLER: true,
        })
        .then((createdStudentTest: StudentTest) => {
          if (this.saveItemsEdler(formattedCreateStudentsTestsDto, createdStudentTest)) {
            return createdStudentTest;
          }
        })
        .catch((e) => {
          throw new InternalServerError();
        });
   
  }

  async saveItems(
    saveStudentTest: CreateStudentsTestsDto,
    createdStudentTest: StudentTest,
  ) {

    if(createdStudentTest?.ALT_JUSTIFICATIVA?.trim()) {
    await this.studentsTestsAnswersEntity
      .createQueryBuilder("ALUNO_TESTE_RESPOSTA")
      .leftJoin("ALUNO_TESTE_RESPOSTA.ATR_ALT", "ATR_ALT")
      .where(`ATR_ALT.ALT_ID = :altId`, { altId: createdStudentTest.ALT_ID })
      .delete()
      .execute();
    }

    const ALT_RESPOSTAS = saveStudentTest?.ALT_RESPOSTAS?.filter((arr, index, self) =>
    index === self.findIndex((t) => (t?.ATR_TEG === arr?.ATR_TEG)))

    if(ALT_RESPOSTAS?.length === 1 && ALT_RESPOSTAS[0]?.ATR_RESPOSTA?.length > 1) {
      console.log(ALT_RESPOSTAS[0].ATR_RESPOSTA.length);
      await this.studentsTestsAnswersEntity
      .createQueryBuilder("ALUNO_TESTE_RESPOSTA")
      .leftJoin("ALUNO_TESTE_RESPOSTA.ATR_ALT", "ATR_ALT")
      .where(`ATR_ALT.ALT_ID = :altId`, { altId: createdStudentTest.ALT_ID })
      .delete()
      .execute();
    }

    await Promise.all(
      ALT_RESPOSTAS?.map(
        async (answers: CreateStudentsTestsAnswersDto) => {
          const atrAlt = JSON.parse(JSON.stringify(createdStudentTest));
          delete atrAlt["ALT_RESPOSTAS"];
          answers["ATR_ALT"] = atrAlt;
          const idTeg = answers?.ATR_TEG;
          const idTest = JSON.parse(JSON.stringify(saveStudentTest["ALT_TES"]));

          const question = await this.findQuestionTemplate(
            idTest,
            +idTeg,
          );
          
          if(question) {
          answers["ATR_CERTO"] =
            answers.ATR_RESPOSTA.toUpperCase() ===
            question.TEG_RESPOSTA_CORRETA.toUpperCase();

          const { ALT_ID } = atrAlt;
          const studentAnswersExisting =
            await this.findStudentTestsAnswersExisting(+idTeg, ALT_ID);

          const formattedData = {
            ...answers,
            questionTemplate: question,
            ATR_MTI: question?.TEG_MTI,
          };

          if (studentAnswersExisting) {
            const { ATR_ID } = studentAnswersExisting;
            this.studentsTestsAnswersEntity
              .save({ ...formattedData, ATR_ID })
              .then(() => {
                return formattedData;
              });
            return;
          }
          this.studentsTestsAnswersEntity.save(formattedData).then(() => {
            return formattedData;
          });
          } else {
            this.studentsTestsAnswersEntity.save(answers).then(() => {
              return answers;
            })
          }
        },
      ),
    );
  }

  async saveItemsEdler(
    saveStudentTest: CreateStudentsTestsDto,
    createdStudentTest: StudentTest,
  ) {

    const ALT_RESPOSTAS = saveStudentTest?.ALT_RESPOSTAS?.filter((arr, index, self) =>
    index === self.findIndex((t) => (t?.ATR_TEG === arr?.ATR_TEG)))

    await this.studentsTestsAnswersEntity
    .createQueryBuilder("ALUNO_TESTE_RESPOSTA")
    .leftJoin('ALUNO_TESTE_RESPOSTA.ATR_ALT', 'ATR_ALT')
    .where(`ATR_ALT.ALT_ID = :altId`, {altId: createdStudentTest.ALT_ID})
    .delete()
    .execute();

    await Promise.all(
      ALT_RESPOSTAS?.map(
        async (answers: CreateStudentsTestsAnswersDto) => {
          const atrAlt = JSON.parse(JSON.stringify(createdStudentTest));
          delete atrAlt["ALT_RESPOSTAS"];
          answers["ATR_ALT"] = atrAlt;
       
            this.studentsTestsAnswersEntity.save(answers).then(() => {
              return answers;
            })
        },
      ),
    );
  }

  async findStudentsBySerie(idSerie: string, options: IPaginationOptions) {
    const queryBuilder = this.studentRepository
      .createQueryBuilder("ALUNO")
      .select(["ALUNO.*, ESCOLA.*, MUNICIPIO.*, SERIES.*, TURMA.*"])
      .leftJoin("turma", "TURMA", "TURMA.TUR_ID = ALUNO.ALU_TUR_ID")
      .leftJoin("escola", "ESCOLA", "ESCOLA.ESC_ID = ALUNO.ALU_ESC_ID")
      .leftJoin("series", "SERIES", "SERIES.SER_ID = ALUNO.ALU_SER_ID")
      .leftJoin(
        "municipio",
        "MUNICIPIO",
        "MUNICIPIO.MUN_ID = ESCOLA.ESC_MUN_ID",
      )
      .where(`ALUNO.ALU_SER_ID = '${idSerie}'`)
      .orderBy("ALUNO.ALU_NOME");
    return paginateRaw<any>(queryBuilder, options);
  }

  async findStudentsBySerieAndTest(
    idSerie: string,
    idTest: string,
    schoolId: number,
    schoolClassId: number,
    countyId: number,
    options: IPaginationOptions,
    orderBy: string,
    column: string,
  ) {
    const queryBuilder = this.studentRepository
      .createQueryBuilder("ALUNO")
      .select(["ALUNO.*, ESCOLA.*, MUNICIPIO.*, SERIES.*, TURMA.*"])
      .leftJoin("turma", "TURMA", "TURMA.TUR_ID = ALUNO.ALU_TUR_ID")
      .leftJoin("escola", "ESCOLA", "ESCOLA.ESC_ID = ALUNO.ALU_ESC_ID")
      .leftJoin("series", "SERIES", "SERIES.SER_ID = ALUNO.ALU_SER_ID")
      .leftJoin(
        "municipio",
        "MUNICIPIO",
        "MUNICIPIO.MUN_ID = ESCOLA.ESC_MUN_ID",
      )
      .andWhere("ALUNO.ALU_ATIVO = 1")
      .andWhere(`ALUNO.ALU_SER_ID = '${idSerie}'`)
      .andWhere(`ALUNO.ALU_ESC_ID = '${schoolId}'`)
      .andWhere(`ALUNO.ALU_TUR_ID = '${schoolClassId}'`);

    const order: any = orderBy;

    switch (column) {
      case "NOME":
        queryBuilder.orderBy("ALUNO.ALU_NOME", order);
        break;
      // case "FINALIZADO":
      //   queryBuilder.orderBy("ALUNO_TESTE.ALT_FINALIZADO", order);
      //   break;
      default:
        queryBuilder.orderBy("ALUNO.ALU_NOME", order);
        break;
    }

    return paginateRaw<any>(queryBuilder, options);
  }

  async findTestsByStudent(idTest: number, idStudent: string) {
    return this.studentTestRepository
      .createQueryBuilder("ALUNO_TESTE")
      .select([
        "ALUNO_TESTE.ALT_FINALIZADO, ALUNO_TESTE.ALT_DT_ATUALIZACAO, ALUNO_TESTE.ALT_BY_AVA_ONLINE, ALUNO_TESTE.ALT_BY_HERBY,  ALUNO_TESTE.ALT_BY_EDLER, USUARIO.USU_NOME, ALUNO_TESTE.ALT_JUSTIFICATIVA, schoolClass.TUR_ID,ALUNO_TESTE_RESPOSTA.*",
      ])
      .leftJoin("usuario", "USUARIO", "USUARIO.USU_ID = ALUNO_TESTE.ALT_USU_ID")
      .leftJoin('ALUNO_TESTE.schoolClass', 'schoolClass')
      .leftJoin(
        "aluno_teste_resposta",
        "ALUNO_TESTE_RESPOSTA",
        "ALUNO_TESTE_RESPOSTA.ATR_ALT_ID = ALUNO_TESTE.ALT_ID",
      )
      .where(
        `ALUNO_TESTE.ALT_ALU_ID = '${idStudent}' AND ALUNO_TESTE.ALT_TES_ID = '${idTest}'`,
      )
      .execute();
  }

  async findTestById(testId: number) {
    const test = await this.testRepository
      .createQueryBuilder("TESTE")
      .select([
        "TESTE.TES_NOME, TESTE.TES_ID, TESTE.TES_SER_ID, TES_DIS.DIS_NOME, TES_DIS.DIS_TIPO",
      ])
      .leftJoin("TESTE.TES_DIS", "TES_DIS")
      .where(`TESTE.TES_ID = '${testId}'`)
      .getRawOne();

    return [test];
  }

  async findTestTemplate(idTest: number) {
    return this.testTemplateRepository
      .createQueryBuilder("TESTE_GABARITO")
      .select("TESTE_GABARITO.TEG_ID, TESTE_GABARITO.TEG_MTI_ID, TESTE_GABARITO.TEG_ORDEM")
      .where(`TESTE_GABARITO.TEG_TES_ID = '${idTest}'`)
      .orderBy("TESTE_GABARITO.TEG_ORDEM")
      .execute();
  }

  async findQuestionTemplate(idTest: string, idQuestion: number) {
    return this.testTemplateRepository
      .createQueryBuilder("TESTE_GABARITO")
      .where(
        `TESTE_GABARITO.TEG_TES_ID = '${idTest}' 
          AND TESTE_GABARITO.TEG_ID = '${idQuestion}'`,
      ).leftJoinAndSelect('TESTE_GABARITO.TEG_MTI', 'TEG_MTI')
      .getOne();
  }

  async getCountStudentsLaunched(
    testId: number,
    schoolId: number,
    schoolClassId: number,
  ) {
    return await this.studentTestRepository
      .createQueryBuilder("STUDENTS_TEST")
      .leftJoin("STUDENTS_TEST.ALT_TES", "ALT_TES")
      .leftJoin("STUDENTS_TEST.ALT_ALU", "ALT_ALU")
      .leftJoin("ALT_ALU.ALU_ESC", "ALU_ESC")
      .leftJoin("ALT_ALU.ALU_TUR", "ALU_TUR")

      .where("STUDENTS_TEST.ALT_TES = :id", { id: testId })
      .andWhere("STUDENTS_TEST.schoolClass = :schoolClassId", { schoolClassId: schoolClassId })
      .andWhere("ALT_ALU.ALU_ATIVO = 1")
      .andWhere("ALU_ESC.ESC_ID = :school", { school: schoolId })
      .andWhere("ALU_TUR.TUR_ID = :schoolClass", { schoolClass: schoolClassId })
      .getCount();
  }

  async findByEdition(
    idEdition: number,
    order: string,
    column: string,
    schoolId: number,
    schoolClassId: number,
    countyId: number,
    serie,
    options: IPaginationOptions,
  ) {
    let testByEdition = await this.assessmentRepository
      .createQueryBuilder("AVALIACAO")
      .leftJoinAndSelect("AVALIACAO.AVA_AVM", "AVA_AVM")
      .leftJoin("AVA_AVM.AVM_MUN", "AVM_MUN")
      .leftJoinAndSelect("AVALIACAO.AVA_TES", "AVA_TES")
      .innerJoin("AVA_TES.TES_SER", "TES_SER", `TES_SER.SER_ID = :serie`, {
        serie,
      })

      .andWhere(`AVALIACAO.AVA_ID = '${idEdition}'`)
      .andWhere("AVM_MUN.MUN_ID = :county", { county: countyId })
      .getOne();

    const resultStudents = await this.findStudentsBySerieAndTest(
      serie,
      null,
      schoolId,
      schoolClassId,
      countyId,
      options,
      order,
      column,
    );

    const resultTestEdition = await Promise.all(
      testByEdition.AVA_TES.map(async (test) => {
        const resultTests = await this.findTestById(test.TES_ID);

        const countStudentsLaunched = await this.getCountStudentsLaunched(
          test.TES_ID,
          schoolId,
          schoolClassId,
        );

        const resultTestsStudents = await resultTests.map(async (item) => {
          const resultTestTemplate = await this.findTestTemplate(test.TES_ID);

          const resultStudentsMapper = resultStudents.items.map(
            async (student) => {
              let verify = true;
              const resultTestStudent = await this.findTestsByStudent(
                test.TES_ID,
                student["ALU_ID"],
              );

              const answers = await Promise.all(resultTestStudent);

              if(!!answers[0]?.TUR_ID && answers[0]?.TUR_ID !== schoolClassId) {
                verify = false;
              }
              return {
                ALU_ID: student["ALU_ID"],
                ALU_NOME: student["ALU_NOME"],
                ALU_INEP: student["ALU_INEP"],
                ALU_AVATAR: student["ALU_AVATAR"],
                ALU_TUR: {
                  TUR_NOME: student["TUR_NOME"],
                  TUR_PERIODO: student["TUR_PERIODO"],
                },
                ALU_MUN: {
                  MUN_NOME: student["MUN_NOME"],
                },
                ALU_ESC: {
                  ESC_NOME: student["ESC_NOME"],
                },
                ALU_SER: {
                  SER_NOME: student["SER_NOME"],
                },
                answers,
                verify,
                template: resultTestTemplate,
              };
            },
          );
            const students = await Promise.all(resultStudentsMapper);
           const filterStudents = students.filter((student) => student.verify)

          item = {
            ...item,
            students: filterStudents,
            total: {
              students: resultStudents.meta.totalItems,
              finished: countStudentsLaunched,
              percentageFinished:
                resultStudents.meta.totalItems > 0
                  ? `${Math.round(
                      (countStudentsLaunched / resultStudents.meta.totalItems) *
                        100,
                    )}%`
                  : "0%",
            },
          } as any;
          return item;
        });

        test = {
          AVA_NOME: testByEdition.AVA_NOME,
          AVM_DT_FIM: testByEdition.AVA_AVM[0].AVM_DT_FIM,
          AVM_DT_INICIO: testByEdition.AVA_AVM[0].AVM_DT_INICIO,
          subjects: await Promise.all(resultTestsStudents),
        } as any;
        return test;
      }),
    );

    return resultTestEdition;
  }

  async findTestsExisting(idTest: string, idStudent: string) {
    return this.studentTestRepository
      .createQueryBuilder("ALUNO_TESTE")
      .select(["ALUNO_TESTE.ALT_ID"])
      .where(
        `ALUNO_TESTE.ALT_ALU_ID = ${idStudent} AND ALUNO_TESTE.ALT_TES_ID = ${idTest}`,
      )
      .getOne();
  }

  async findStudentTestsAnswersExisting(idTeg: number, idAlt: string) {
    return this.studentsTestsAnswersEntity
      .createQueryBuilder("ALUNO_TESTE_RESPOSTA")
      .select(["ALUNO_TESTE_RESPOSTA.ATR_ID"])
      .leftJoin('ALUNO_TESTE_RESPOSTA.questionTemplate', 'questionTemplate')
      .where(
        `ALUNO_TESTE_RESPOSTA.ATR_ALT_ID = '${idAlt}'`,
      ).andWhere('questionTemplate.TEG_ID = :idTeg', {idTeg})
      .getOne();
  }

  async findStudentTestsAnswersById(idAlt: string) {
    return this.studentsTestsAnswersEntity
      .createQueryBuilder("ALUNO_TESTE_RESPOSTA")
      .select(["ALUNO_TESTE_RESPOSTA.ATR_ID"])
      .where(`ALUNO_TESTE_RESPOSTA.ATR_ALT_ID = '${idAlt}'`)
      .getOne();
  }

  async deleteStudentTestsAnswers(
    createStudentsTestsDto: CreateStudentsTestsDto,
  ): Promise<boolean> {
    const idTest = JSON.parse(
      JSON.stringify(createStudentsTestsDto["ALT_TES"]),
    );
    const idStudent = JSON.parse(
      JSON.stringify(createStudentsTestsDto["ALT_ALU"]),
    );
    const altId = await this.findTestsExisting(idTest, idStudent);

    if (altId) {
      const { ALT_ID } = altId;

      await this.studentsTestsAnswersEntity
      .createQueryBuilder("ALUNO_TESTE_RESPOSTA")
      .leftJoin('ALUNO_TESTE_RESPOSTA.ATR_ALT', 'ATR_ALT')
      .where(`ATR_ALT.ALT_ID = :altId`, {altId: ALT_ID})
      .delete()
      .execute();

      await this.studentTestRepository
        .createQueryBuilder("aluno_teste")
        .where("aluno_teste.ALT_ID = :idAlt", { idAlt: ALT_ID })
        .delete()
        .execute();

      return true;
    }
    return false;
  }

  async getStudentByHistorySchool(
    testId: number,
    countyId: number,
    schoolId: number,
    schoolClassId: number,
  ): Promise<StudentTest[]> {
    const queryBuilder = this.studentTestRepository
      .createQueryBuilder("student")
      .leftJoinAndSelect("student.ALT_TES", "ALT_TES")
      .leftJoinAndSelect("student.ANSWERS_TEST", "ANSWERS_TEST")
      .leftJoinAndSelect("ANSWERS_TEST.ATR_MTI", "ATR_MTI")
      .leftJoinAndSelect("student.ALT_ALU", "ALT_ALU")
      .leftJoinAndSelect("ALT_ALU.ALU_ESC", "ALU_ESC")
      .leftJoinAndSelect("ALT_ALU.ALU_TUR", "ALU_TUR")
      .leftJoinAndSelect("ALT_ALU.schoolClasses", "schoolClasses")
      .leftJoinAndSelect("schoolClasses.schoolClass", "schoolClass")
      .leftJoinAndSelect("schoolClass.TUR_ESC", "TUR_ESC")
      .leftJoinAndSelect("schoolClass.TUR_MUN", "TUR_MUN");
    // .loadRelationCountAndMap(
    //   "student.QUESTOES_CERTA",
    //   "student.ANSWERS_TEST",
    //   "questions",
    //   (qb) => qb.where("questions.ATR_CERTO = true"),
    // );
    if (testId) {
      queryBuilder.where("ALT_TES.TES_ID = :id", { id: testId });
    }

    // if (county) {
    //   queryBuilder.andWhere("TUR_MUN.MUN_ID = :id", {
    //     id: county,
    //   });
    // }
    // if (school) {
    //   queryBuilder.andWhere("TUR_ESC.ESC_ID = :id", {
    //     id: school,
    //   });
    // }
    // if (schoolClass) {
    //   queryBuilder.andWhere("schoolClass.TUR_ID = :id", {
    //     id: schoolClass,
    //   });
    // }

    let students = await queryBuilder.getMany();
    if (schoolClassId) {
      students = students.filter((student) => {
        const findCounty = student.ALT_ALU?.schoolClasses?.find(
          (schoolStu) => schoolStu.schoolClass.TUR_ID === schoolClassId,
        );

        if (findCounty || student.ALT_ALU.ALU_TUR.TUR_ID === schoolClassId) {
          return student;
        }
      });
    } else if (schoolId) {
      students = students.filter((student) => {
        const findCounty = student.ALT_ALU?.schoolClasses?.find(
          (schoolStu) => schoolStu.schoolClass.TUR_ESC.ESC_ID === schoolId,
        );

        if (findCounty || student.ALT_ALU.ALU_ESC.ESC_ID === schoolId) {
          return student;
        }
      });
    } else if (countyId) {
      students = students.filter((student) => {
        const findCounty = student.ALT_ALU?.schoolClasses?.find(
          (school) => school.schoolClass.TUR_MUN.MUN_ID === countyId,
        );

        if (findCounty) {
          return student;
        }
      });
    }

    return students;
  }
}
