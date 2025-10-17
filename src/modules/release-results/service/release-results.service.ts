import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectConnection, InjectRepository } from '@nestjs/typeorm'
import { isFuture, isPast } from 'date-fns'
import { IPaginationOptions, paginateRaw } from 'nestjs-typeorm-paginate'
import { Assessment } from 'src/modules/assessment/model/entities/assessment.entity'
import { AssessmentCounty } from 'src/modules/assessment/model/entities/assessment-county.entity'
import { School } from 'src/modules/school/model/entities/school.entity'
import { Student } from 'src/modules/student/model/entities/student.entity'
import { SubjectTypeEnum } from 'src/modules/subject/model/enum/subject-type.enum'
import { Test } from 'src/modules/test/model/entities/test.entity'
import { TestTemplate } from 'src/modules/test/model/entities/test-template.entity'
import { User } from 'src/modules/user/model/entities/user.entity'
import { InternalServerError } from 'src/utils/errors'
import { Connection, Repository } from 'typeorm'
import { Transactional } from 'typeorm-transactional-cls-hooked'

import { JUSTIFICATION_LEVEL, READING_LEVEL } from '../constants/levels'
import {
  CreateStudentsTestsAnswersDto,
  CreateStudentsTestsDto,
} from '../model/dto/create-students-tests.dto'
import { ImportResultStudentDto } from '../model/dto/import-result-students.dto'
import { StudentTest } from '../model/entities/student-test.entity'
import { StudentTestAnswer } from '../model/entities/student-test-answer.entity'

@Injectable()
export class ReleaseResultsService {
  constructor(
    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,
    @InjectRepository(AssessmentCounty)
    private assessmentCountyRepository: Repository<AssessmentCounty>,
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
    @InjectRepository(School)
    private schoolRepository: Repository<School>,

    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async validateAssessmentAvailable(studentId: number, testId: number) {
    const test = await this.testRepository
      .createQueryBuilder('Test')
      .select(['Test.TES_ID', 'TES_ASSESMENTS.AVA_ID'])
      .innerJoin('Test.TES_ASSESMENTS', 'TES_ASSESMENTS')
      .where('Test.TES_ID = :testId', { testId })
      .getOne()

    const student = await this.studentRepository
      .createQueryBuilder('Student')
      .select([
        'Student.ALU_ID',
        'ALU_TUR.TUR_ID',
        'TUR_ESC.ESC_TIPO',
        'TUR_MUN.MUN_ID',
      ])
      .innerJoin('Student.ALU_TUR', 'ALU_TUR')
      .innerJoin('ALU_TUR.TUR_MUN', 'TUR_MUN')
      .innerJoin('ALU_TUR.TUR_ESC', 'TUR_ESC')
      .where('Student.ALU_ID = :studentId', { studentId })
      .getOne()

    const assessmentId = test?.TES_ASSESMENTS[0]?.AVA_ID
    const countyId = student?.ALU_TUR?.TUR_MUN.MUN_ID
    const type = student?.ALU_TUR?.TUR_ESC?.ESC_TIPO

    const assessmentCounty = await this.assessmentCountyRepository
      .createQueryBuilder('AssessmentCounty')
      .where('AssessmentCounty.AVM_AVA = :assessmentId', {
        assessmentId,
      })
      .andWhere('AssessmentCounty.AVM_MUN = :countyId', {
        countyId,
      })
      .andWhere('AssessmentCounty.AVM_TIPO = :type', { type })
      .getOne()

    if (!assessmentCounty) {
      throw new ForbiddenException(`Avaliação não encontrada`)
    }

    const initialDate = new Date(
      new Date(assessmentCounty?.AVM_DT_INICIO).toDateString(),
    )

    const finalDate = new Date(
      new Date(assessmentCounty?.AVM_DT_FIM).toDateString(),
    )
    const newFinalDate = new Date(finalDate.getTime())

    newFinalDate.setDate(finalDate.getDate() + 1)

    if (
      (!isPast(initialDate) && isFuture(newFinalDate)) ||
      (isPast(initialDate) && !isFuture(newFinalDate))
    ) {
      throw new ForbiddenException(
        `Avaliação está fora do período de lançamento`,
      )
    }

    return {
      student,
      test,
    }
  }

  @Transactional()
  async importResult({
    studentId,
    testId,
    justificationLevel,
    readingLevel,
    supplier,
    answers,
  }: ImportResultStudentDto) {
    await this.validateAssessmentAvailable(studentId, testId)

    let ALT_RESPOSTAS = []

    const test = await this.testRepository.findOne({
      where: {
        TES_ID: testId,
      },
      relations: ['TES_DIS'],
    })

    if (!test) {
      throw new NotFoundException('Teste não encontrado.')
    }

    if (readingLevel && answers?.length) {
      throw new BadRequestException(
        'Você não pode lançar nível de leitura junto de questões objetivas.',
      )
    }

    if (
      (test.TES_DIS.DIS_TIPO === SubjectTypeEnum.LEITURA && answers?.length) ||
      (test.TES_DIS.DIS_TIPO === SubjectTypeEnum.OBJETIVA && readingLevel)
    ) {
      throw new BadRequestException('Dados incompatíveis para o tipo da prova.')
    }

    if (!justificationLevel && !readingLevel) {
      ALT_RESPOSTAS = answers?.map((answer) => {
        return {
          ATR_RESPOSTA: answer?.response,
          ATR_TEG: answer?.questionId,
        }
      }) as any
    }

    if (!justificationLevel && readingLevel) {
      ALT_RESPOSTAS = [
        {
          ATR_RESPOSTA: READING_LEVEL[readingLevel],
          ATR_TEG: null,
        },
      ]
    }

    const data = {
      ALT_ALU: studentId as any,
      ALT_TES: testId as any,
      ALT_JUSTIFICATIVA: JUSTIFICATION_LEVEL[justificationLevel],
      ALT_RESPOSTAS,
      ALT_FORNECEDOR: supplier,
      ALT_USU: null,
      ALT_ATIVO: !justificationLevel,
      ALT_FINALIZADO: !justificationLevel,
    } as CreateStudentsTestsDto

    try {
      await this.add(data, null)
    } catch (e) {
      throw new InternalServerError()
    }
  }

  async addByImport(
    createStudentsTestsDto: CreateStudentsTestsDto,
    user: User,
  ) {
    const idTest = JSON.parse(JSON.stringify(createStudentsTestsDto.ALT_TES))
    const idStudent = JSON.parse(JSON.stringify(createStudentsTestsDto.ALT_ALU))
    const altId = await this.findTestsExisting(idTest, idStudent)

    const student = await this.studentRepository.findOne({
      where: {
        ALU_ID: Number(idStudent),
      },
      relations: ['ALU_TUR'],
      select: ['ALU_ID', 'ALU_TUR'],
    })

    if (altId) {
      const { ALT_ID } = altId

      try {
        const createdStudentTest = await this.studentTestRepository.save(
          { ...createStudentsTestsDto, schoolClass: student?.ALU_TUR, ALT_ID },
          { data: user },
        )

        await this.saveItemsImport(createStudentsTestsDto, createdStudentTest)

        return
      } catch (e) {
        throw new InternalServerError()
      }
    }

    try {
      const createdStudentTest = await this.studentTestRepository.save(
        { ...createStudentsTestsDto, schoolClass: student?.ALU_TUR },
        { data: user },
      )

      await this.saveItemsImport(createStudentsTestsDto, createdStudentTest)
    } catch (e) {
      throw new InternalServerError()
    }
  }

  @Transactional()
  async addByAssessmentOnline(
    createStudentsTestsDto: CreateStudentsTestsDto,
    user: User,
  ) {
    const testId = JSON.parse(JSON.stringify(createStudentsTestsDto.ALT_TES))
    const studentId = JSON.parse(JSON.stringify(createStudentsTestsDto.ALT_ALU))

    const test = await this.findTestTemplate(testId)

    const { student } = await this.validateAssessmentAvailable(
      studentId,
      testId,
    )

    if (test?.length !== createStudentsTestsDto?.ALT_RESPOSTAS?.length) {
      throw new BadRequestException(
        'Informe a quantidade de questões existentes na prova.',
      )
    }

    const altId = await this.findTestsExisting(testId, studentId)

    const queryRunner = this.connection.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      let studentTest: StudentTest

      const { ALT_ID } = altId

      if (altId) {
        studentTest = await queryRunner.manager.save(
          StudentTest,
          {
            ...createStudentsTestsDto,
            schoolClass: student?.ALU_TUR,
            ALT_ID,
            ALT_FORNECEDOR: 'Avaliação Online',
            ALT_JUSTIFICATIVA: null,
            ALT_ATIVO: true,
            ALT_FINALIZADO: true,
          },
          { data: user },
        )
      } else {
        studentTest = await queryRunner.manager.save(
          StudentTest,
          {
            ...createStudentsTestsDto,
            schoolClass: student?.ALU_TUR,
            ALT_FORNECEDOR: 'Avaliação Online',
            ALT_JUSTIFICATIVA: null,
            ALT_ATIVO: true,
            ALT_FINALIZADO: true,
          },
          { data: user },
        )
      }

      await this.saveItemsTransactional(
        createStudentsTestsDto,
        studentTest,
        queryRunner,
      )

      await queryRunner.commitTransaction()
      return studentTest
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw new InternalServerError()
    } finally {
      await queryRunner.release()
    }
  }

  @Transactional()
  async addByHerby(createStudentsTestsDto: CreateStudentsTestsDto) {
    const testId = JSON.parse(JSON.stringify(createStudentsTestsDto.ALT_TES))
    const studentId = JSON.parse(JSON.stringify(createStudentsTestsDto.ALT_ALU))
    const altId = await this.findTestsExisting(testId, studentId)

    const { student } = await this.validateAssessmentAvailable(
      studentId,
      testId,
    )

    const queryRunner = this.connection.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      let studentTest: StudentTest

      if (altId) {
        studentTest = await queryRunner.manager.save(StudentTest, {
          ...createStudentsTestsDto,
          schoolClass: student?.ALU_TUR,
          ALT_FORNECEDOR: 'Herby',
          ALT_ID: altId.ALT_ID,
        })
      } else {
        studentTest = await queryRunner.manager.save(StudentTest, {
          ...createStudentsTestsDto,
          ALT_FORNECEDOR: 'Herby',
          schoolClass: student?.ALU_TUR,
        })
      }

      await this.saveItemsTransactional(
        createStudentsTestsDto,
        studentTest,
        queryRunner,
      )

      await queryRunner.commitTransaction()
      return studentTest
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw new InternalServerError()
    } finally {
      await queryRunner.release()
    }
  }

  @Transactional()
  async addByEdler(createStudentsTestsDto: CreateStudentsTestsDto) {
    const testId = JSON.parse(JSON.stringify(createStudentsTestsDto.ALT_TES))
    const studentId = JSON.parse(JSON.stringify(createStudentsTestsDto.ALT_ALU))
    const altId = await this.findTestsExisting(testId, studentId)

    const { student } = await this.validateAssessmentAvailable(
      studentId,
      testId,
    )

    const formattedCreateStudentsTestsDto = {
      ...createStudentsTestsDto,
    }

    if (createStudentsTestsDto.ALT_RESPOSTAS.length) {
      formattedCreateStudentsTestsDto.ALT_JUSTIFICATIVA = null
      formattedCreateStudentsTestsDto.ALT_FINALIZADO = true
    }

    const queryRunner = this.connection.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      let studentTest: StudentTest

      if (altId) {
        studentTest = await queryRunner.manager.save(StudentTest, {
          ...createStudentsTestsDto,
          schoolClass: student?.ALU_TUR,
          ALT_FORNECEDOR: 'Edler',
          ALT_ID: altId.ALT_ID,
        })
      } else {
        studentTest = await queryRunner.manager.save(StudentTest, {
          ...createStudentsTestsDto,
          ALT_FORNECEDOR: 'Edler',
          schoolClass: student?.ALU_TUR,
        })
      }

      await this.saveItemsEdler(
        createStudentsTestsDto,
        studentTest,
        queryRunner,
      )

      await queryRunner.commitTransaction()
      return studentTest
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw new InternalServerError()
    } finally {
      await queryRunner.release()
    }
  }

  async saveItemsImport(
    saveStudentTest: CreateStudentsTestsDto,
    createdStudentTest: StudentTest,
  ) {
    if (createdStudentTest?.ALT_JUSTIFICATIVA?.trim()) {
      await this.deleteAllAnswersFromStudentTest(createdStudentTest.ALT_ID)
    }

    const ALT_RESPOSTAS = saveStudentTest?.ALT_RESPOSTAS?.filter(
      (arr, index, self) =>
        index === self.findIndex((t) => t?.ATR_TEG === arr?.ATR_TEG),
    )

    if (
      ALT_RESPOSTAS?.length === 1 &&
      ALT_RESPOSTAS[0]?.ATR_RESPOSTA?.length > 1
    ) {
      await this.deleteAllAnswersFromStudentTest(createdStudentTest.ALT_ID)
    }

    await Promise.all(
      ALT_RESPOSTAS?.map(async (answers: CreateStudentsTestsAnswersDto) => {
        const atrAlt = JSON.parse(JSON.stringify(createdStudentTest))
        delete atrAlt.ALT_RESPOSTAS
        answers.ATR_ALT = atrAlt
        const idTeg = answers?.ATR_TEG
        const idTest = JSON.parse(JSON.stringify(saveStudentTest.ALT_TES))

        const question = await this.findQuestionTemplate(idTest, +idTeg)

        if (question) {
          answers.ATR_CERTO =
            answers.ATR_RESPOSTA.toUpperCase() ===
            question.TEG_RESPOSTA_CORRETA.toUpperCase()

          const { ALT_ID } = atrAlt
          const studentAnswersExisting =
            await this.findStudentTestsAnswersExisting(+idTeg, ALT_ID)

          const formattedData = {
            ...answers,
            questionTemplate: question,
            ATR_MTI: question?.TEG_MTI,
          }

          if (studentAnswersExisting) {
            await this.studentsTestsAnswersEntity.save({
              ...formattedData,
              ATR_ID: studentAnswersExisting.ATR_ID,
            })

            return formattedData
          }

          await this.studentsTestsAnswersEntity.save(formattedData)

          return formattedData
        } else {
          await this.studentsTestsAnswersEntity.save(answers)

          return answers
        }
      }),
    )
  }

  async deleteAllAnswersFromStudentTest(altId: number) {
    await this.studentsTestsAnswersEntity
      .createQueryBuilder('ALUNO_TESTE_RESPOSTA')
      .leftJoin('ALUNO_TESTE_RESPOSTA.ATR_ALT', 'ATR_ALT')
      .where(`ATR_ALT.ALT_ID = :altId`, { altId })
      .delete()
      .execute()
  }

  async findStudentsBySerie(idSerie: string, options: IPaginationOptions) {
    const queryBuilder = this.studentRepository
      .createQueryBuilder('ALUNO')
      .select(['ALUNO.*, ESCOLA.*, MUNICIPIO.*, SERIES.*, TURMA.*'])
      .leftJoin('turma', 'TURMA', 'TURMA.TUR_ID = ALUNO.ALU_TUR_ID')
      .leftJoin('escola', 'ESCOLA', 'ESCOLA.ESC_ID = ALUNO.ALU_ESC_ID')
      .leftJoin('series', 'SERIES', 'SERIES.SER_ID = ALUNO.ALU_SER_ID')
      .leftJoin(
        'municipio',
        'MUNICIPIO',
        'MUNICIPIO.MUN_ID = ESCOLA.ESC_MUN_ID',
      )
      .where(`ALUNO.ALU_SER_ID = '${idSerie}'`)
      .orderBy('ALUNO.ALU_NOME')
    return paginateRaw<any>(queryBuilder, options)
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
      .createQueryBuilder('ALUNO')
      .select(['ALUNO.*, ESCOLA.*, MUNICIPIO.*, SERIES.*, TURMA.*'])
      .leftJoin('turma', 'TURMA', 'TURMA.TUR_ID = ALUNO.ALU_TUR_ID')
      .leftJoin('escola', 'ESCOLA', 'ESCOLA.ESC_ID = ALUNO.ALU_ESC_ID')
      .leftJoin('series', 'SERIES', 'SERIES.SER_ID = ALUNO.ALU_SER_ID')
      .leftJoin(
        'municipio',
        'MUNICIPIO',
        'MUNICIPIO.MUN_ID = ESCOLA.ESC_MUN_ID',
      )
      .andWhere('ALUNO.ALU_ATIVO = 1')
      .andWhere(`ALUNO.ALU_SER_ID = '${idSerie}'`)
      .andWhere(`ALUNO.ALU_ESC_ID = '${schoolId}'`)
      .andWhere(`ALUNO.ALU_TUR_ID = '${schoolClassId}'`)

    const order: any = orderBy

    switch (column) {
      case 'NOME':
        queryBuilder.orderBy('ALUNO.ALU_NOME', order)
        break
      default:
        queryBuilder.orderBy('ALUNO.ALU_NOME', order)
        break
    }

    return paginateRaw<any>(queryBuilder, options)
  }

  async findTestsByStudent(idTest: number, idStudent: string) {
    return this.studentTestRepository
      .createQueryBuilder('ALUNO_TESTE')
      .select([
        'ALUNO_TESTE.ALT_FINALIZADO, ALUNO_TESTE.ALT_DT_ATUALIZACAO, ALUNO_TESTE.ALT_FORNECEDOR,ALUNO_TESTE.ALT_BY_AVA_ONLINE, ALUNO_TESTE.ALT_BY_HERBY,  ALUNO_TESTE.ALT_BY_EDLER, USUARIO.USU_NOME, ALUNO_TESTE.ALT_JUSTIFICATIVA, schoolClass.TUR_ID,ALUNO_TESTE_RESPOSTA.*',
      ])
      .leftJoin('usuario', 'USUARIO', 'USUARIO.USU_ID = ALUNO_TESTE.ALT_USU_ID')
      .leftJoin('ALUNO_TESTE.schoolClass', 'schoolClass')
      .leftJoin(
        'aluno_teste_resposta',
        'ALUNO_TESTE_RESPOSTA',
        'ALUNO_TESTE_RESPOSTA.ATR_ALT_ID = ALUNO_TESTE.ALT_ID',
      )
      .where(
        `ALUNO_TESTE.ALT_ALU_ID = '${idStudent}' AND ALUNO_TESTE.ALT_TES_ID = '${idTest}'`,
      )
      .execute()
  }

  async findTestById(testId: number) {
    const test = await this.testRepository
      .createQueryBuilder('TESTE')
      .select([
        'TESTE.TES_NOME, TESTE.TES_ID, TESTE.TES_SER_ID, TES_DIS.DIS_NOME, TES_DIS.DIS_TIPO',
      ])
      .leftJoin('TESTE.TES_DIS', 'TES_DIS')
      .where(`TESTE.TES_ID = '${testId}'`)
      .getRawOne()

    return [test]
  }

  async findTestTemplate(idTest: number) {
    return this.testTemplateRepository
      .createQueryBuilder('TESTE_GABARITO')
      .select(
        'TESTE_GABARITO.TEG_ID, TESTE_GABARITO.TEG_MTI_ID, TESTE_GABARITO.TEG_ORDEM',
      )
      .where(`TESTE_GABARITO.TEG_TES_ID = '${idTest}'`)
      .orderBy('TESTE_GABARITO.TEG_ORDEM')
      .execute()
  }

  async findQuestionTemplate(idTest: string, idQuestion: number) {
    return this.testTemplateRepository
      .createQueryBuilder('TESTE_GABARITO')
      .where(
        `TESTE_GABARITO.TEG_TES_ID = '${idTest}' 
          AND TESTE_GABARITO.TEG_ID = '${idQuestion}'`,
      )
      .leftJoinAndSelect('TESTE_GABARITO.TEG_MTI', 'TEG_MTI')
      .getOne()
  }

  async getCountStudentsLaunched(
    testId: number,
    schoolId: number,
    schoolClassId: number,
  ) {
    return await this.studentTestRepository
      .createQueryBuilder('STUDENTS_TEST')
      .leftJoin('STUDENTS_TEST.ALT_TES', 'ALT_TES')
      .leftJoin('STUDENTS_TEST.ALT_ALU', 'ALT_ALU')
      .leftJoin('ALT_ALU.ALU_ESC', 'ALU_ESC')
      .leftJoin('ALT_ALU.ALU_TUR', 'ALU_TUR')

      .where('STUDENTS_TEST.ALT_TES = :id', { id: testId })
      .andWhere('STUDENTS_TEST.schoolClass = :schoolClassId', {
        schoolClassId,
      })
      .andWhere('ALT_ALU.ALU_ATIVO = 1')
      .andWhere('ALU_ESC.ESC_ID = :school', { school: schoolId })
      .andWhere('ALU_TUR.TUR_ID = :schoolClass', { schoolClass: schoolClassId })
      .getCount()
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
    const school = await this.schoolRepository.findOne({
      where: {
        ESC_ID: schoolId,
      },
    })

    const testByEdition = await this.assessmentRepository
      .createQueryBuilder('AVALIACAO')
      .leftJoinAndSelect(
        'AVALIACAO.AVA_AVM',
        'AVA_AVM',
        'AVA_AVM.AVM_TIPO = :typeSchool',
        {
          typeSchool: school.ESC_TIPO,
        },
      )
      .leftJoin('AVA_AVM.AVM_MUN', 'AVM_MUN')
      .leftJoinAndSelect('AVALIACAO.AVA_TES', 'AVA_TES')
      .innerJoin('AVA_TES.TES_SER', 'TES_SER', `TES_SER.SER_ID = :serie`, {
        serie,
      })
      .andWhere(`AVALIACAO.AVA_ID = '${idEdition}'`)

      .andWhere('AVM_MUN.MUN_ID = :county', { county: countyId })
      .getOne()

    const resultStudents = await this.findStudentsBySerieAndTest(
      serie,
      null,
      schoolId,
      schoolClassId,
      countyId,
      options,
      order,
      column,
    )

    const resultTestEdition = await Promise.all(
      testByEdition?.AVA_TES?.map(async (test) => {
        const resultTests = await this.findTestById(test.TES_ID)

        const countStudentsLaunched = await this.getCountStudentsLaunched(
          test.TES_ID,
          schoolId,
          schoolClassId,
        )

        const resultTestsStudents = await resultTests.map(async (item) => {
          const resultTestTemplate = await this.findTestTemplate(test.TES_ID)

          const resultStudentsMapper = resultStudents.items.map(
            async (student) => {
              let verify = true
              const resultTestStudent = await this.findTestsByStudent(
                test.TES_ID,
                student.ALU_ID,
              )

              const answers = await Promise.all(resultTestStudent)

              if (
                !!answers[0]?.TUR_ID &&
                answers[0]?.TUR_ID !== schoolClassId
              ) {
                verify = false
              }
              return {
                ALU_ID: student.ALU_ID,
                ALU_NOME: student.ALU_NOME,
                ALU_INEP: student.ALU_INEP,
                ALU_AVATAR: student.ALU_AVATAR,
                ALU_TUR: {
                  TUR_NOME: student.TUR_NOME,
                  TUR_PERIODO: student.TUR_PERIODO,
                },
                ALU_MUN: {
                  MUN_NOME: student.MUN_NOME,
                },
                ALU_ESC: {
                  ESC_NOME: student.ESC_NOME,
                },
                ALU_SER: {
                  SER_NOME: student.SER_NOME,
                },
                answers,
                verify,
                template: resultTestTemplate,
              }
            },
          )
          const students = await Promise.all(resultStudentsMapper)
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
                  : '0%',
            },
          } as any
          return item
        })

        test = {
          AVA_NOME: testByEdition.AVA_NOME,
          AVM_DT_FIM: testByEdition.AVA_AVM[0].AVM_DT_FIM,
          AVM_DT_INICIO: testByEdition.AVA_AVM[0].AVM_DT_INICIO,
          subjects: await Promise.all(resultTestsStudents),
        } as any
        return test
      }),
    )

    return resultTestEdition
  }

  async findTestsExisting(idTest: string, idStudent: string) {
    return this.studentTestRepository
      .createQueryBuilder('ALUNO_TESTE')
      .select(['ALUNO_TESTE.ALT_ID'])
      .where(
        `ALUNO_TESTE.ALT_ALU_ID = ${idStudent} AND ALUNO_TESTE.ALT_TES_ID = ${idTest}`,
      )
      .getOne()
  }

  async findStudentTestsAnswersExisting(idTeg: number, idAlt: string) {
    return this.studentsTestsAnswersEntity
      .createQueryBuilder('ALUNO_TESTE_RESPOSTA')
      .select([
        'ALUNO_TESTE_RESPOSTA.ATR_ID',
        'ALUNO_TESTE_RESPOSTA.ATR_RESPOSTA',
      ])
      .leftJoin('ALUNO_TESTE_RESPOSTA.questionTemplate', 'questionTemplate')
      .where(`ALUNO_TESTE_RESPOSTA.ATR_ALT_ID = '${idAlt}'`)
      .andWhere('questionTemplate.TEG_ID = :idTeg', { idTeg })
      .getOne()
  }

  async findStudentTestsAnswersById(idAlt: string) {
    return this.studentsTestsAnswersEntity
      .createQueryBuilder('ALUNO_TESTE_RESPOSTA')
      .select(['ALUNO_TESTE_RESPOSTA.ATR_ID'])
      .where(`ALUNO_TESTE_RESPOSTA.ATR_ALT_ID = '${idAlt}'`)
      .getOne()
  }

  @Transactional()
  async deleteStudentTestsAnswers(
    createStudentsTestsDto: CreateStudentsTestsDto,
  ): Promise<boolean> {
    const idTest = JSON.parse(JSON.stringify(createStudentsTestsDto.ALT_TES))
    const idStudent = JSON.parse(JSON.stringify(createStudentsTestsDto.ALT_ALU))
    const altId = await this.findTestsExisting(idTest, idStudent)

    if (altId) {
      const { ALT_ID } = altId

      await this.deleteAllAnswersFromStudentTest(ALT_ID)

      await this.studentTestRepository
        .createQueryBuilder('aluno_teste')
        .where('aluno_teste.ALT_ID = :idAlt', { idAlt: ALT_ID })
        .delete()
        .execute()

      return true
    }
    return false
  }

  async add(createStudentsTestsDto: CreateStudentsTestsDto, user: User) {
    const queryRunner = this.connection.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const idTest = JSON.parse(JSON.stringify(createStudentsTestsDto.ALT_TES))
      const idStudent = JSON.parse(
        JSON.stringify(createStudentsTestsDto.ALT_ALU),
      )

      const altId = await this.findTestsExisting(idTest, idStudent)

      const student = await this.studentRepository.findOne({
        where: { ALU_ID: idStudent },
        relations: ['ALU_TUR'],
        select: ['ALU_ID', 'ALU_TUR'],
      })

      let studentTest: StudentTest

      if (altId) {
        studentTest = await queryRunner.manager.save(
          StudentTest,
          {
            ...createStudentsTestsDto,
            schoolClass: student?.ALU_TUR,
            ALT_ID: altId.ALT_ID,
          },
          {
            data: user,
          },
        )
      } else {
        studentTest = await queryRunner.manager.save(
          StudentTest,
          {
            ...createStudentsTestsDto,
            schoolClass: student?.ALU_TUR,
          },
          {
            data: user,
          },
        )
      }

      await this.saveItemsTransactional(
        createStudentsTestsDto,
        studentTest,
        queryRunner,
      )

      await queryRunner.commitTransaction()
      return studentTest
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw new InternalServerError()
    } finally {
      await queryRunner.release()
    }
  }

  private async saveItemsTransactional(
    saveStudentTest: CreateStudentsTestsDto,
    createdStudentTest: StudentTest,
    queryRunner,
  ) {
    const ALT_RESPOSTAS = saveStudentTest?.ALT_RESPOSTAS?.filter(
      (arr, index, self) =>
        index === self.findIndex((t) => t?.ATR_TEG === arr?.ATR_TEG),
    )

    if (createdStudentTest?.ALT_JUSTIFICATIVA?.trim()) {
      await queryRunner.manager.delete(StudentTestAnswer, {
        ATR_ALT: { ALT_ID: createdStudentTest.ALT_ID },
      })
    }

    if (
      ALT_RESPOSTAS?.length === 1 &&
      ALT_RESPOSTAS[0]?.ATR_RESPOSTA?.length > 1
    ) {
      await queryRunner.manager.delete(StudentTestAnswer, {
        ATR_ALT: { ALT_ID: createdStudentTest.ALT_ID },
      })
    }

    for (const answer of ALT_RESPOSTAS) {
      const atrAlt = JSON.parse(JSON.stringify(createdStudentTest))
      delete atrAlt.ALT_RESPOSTAS
      answer.ATR_ALT = atrAlt
      const idTeg = answer?.ATR_TEG
      const idTest = JSON.parse(JSON.stringify(saveStudentTest.ALT_TES))

      const question = await this.findQuestionTemplate(idTest, +idTeg)

      const formattedAnswer = {
        ...answer,
        ATR_ALT: createdStudentTest,
        questionTemplate: question,
        ATR_MTI: question?.TEG_MTI,
        ATR_CERTO:
          question &&
          answer.ATR_RESPOSTA.toUpperCase() ===
            question.TEG_RESPOSTA_CORRETA.toUpperCase(),
      }

      const { ALT_ID } = atrAlt

      const existingAnswer = await this.findStudentTestsAnswersExisting(
        +idTeg,
        ALT_ID,
      )

      if (existingAnswer) {
        await queryRunner.manager.save(StudentTestAnswer, {
          ...formattedAnswer,
          ATR_ID: existingAnswer.ATR_ID,
        })
      } else {
        await queryRunner.manager.save(StudentTestAnswer, formattedAnswer)
      }
    }
  }

  private async saveItemsEdler(
    saveStudentTest: CreateStudentsTestsDto,
    createdStudentTest: StudentTest,
    queryRunner,
  ) {
    const ALT_RESPOSTAS = saveStudentTest?.ALT_RESPOSTAS?.filter(
      (arr, index, self) =>
        index === self.findIndex((t) => t?.ATR_TEG === arr?.ATR_TEG),
    )

    await queryRunner.manager.delete(StudentTestAnswer, {
      ATR_ALT: { ALT_ID: createdStudentTest.ALT_ID },
    })

    for (const answer of ALT_RESPOSTAS) {
      const atrAlt = JSON.parse(JSON.stringify(createdStudentTest))
      delete atrAlt.ALT_RESPOSTAS
      answer.ATR_ALT = atrAlt

      await queryRunner.manager.save(StudentTestAnswer, answer)
    }
  }
}
