import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectConnection, InjectRepository } from '@nestjs/typeorm'
import { writeFileSync } from 'fs'
import * as _ from 'lodash'
import { paginateRaw, Pagination } from 'nestjs-typeorm-paginate'
import { PaginationParams } from 'src/helpers/params'
import { editFileName } from 'src/helpers/utils'
import { AssessmentOnline } from 'src/modules/assessment-online/entities/assessment-online.entity'
import { County } from 'src/modules/counties/model/entities/county.entity'
import {
  REPROCESS_DISPATCHER,
  ReprocessDispatcher,
} from 'src/modules/jobs/dispatcher/reprocess-dispatcher.interface'
import { AnswerKeyChangeLog } from 'src/modules/jobs/model/entities/answer-key-change-log.entity'
import { AnswerKeyChangeField } from 'src/modules/jobs/model/enums/answer-key-change-field.enum'
import { StudentTest } from 'src/modules/release-results/model/entities/student-test.entity'
import { StudentTestAnswer } from 'src/modules/release-results/model/entities/student-test-answer.entity'
import { School } from 'src/modules/school/model/entities/school.entity'
import { Student } from 'src/modules/student/model/entities/student.entity'
import { SubjectTypeEnum } from 'src/modules/subject/model/enum/subject-type.enum'
import { User } from 'src/modules/user/model/entities/user.entity'
import { InternalServerError } from 'src/utils/errors'
import { paginateData } from 'src/utils/paginate-data'
import { Connection, Repository } from 'typeorm'

import { serieNames, serieNumbers } from '../constants/series'
import {
  mapperTestsWithAssessmentOnline,
  mapperUsersUploadInfoByHerby,
} from '../mappers'
import { CreateTestDto } from '../model/dto/create-test.dto'
import { GetTestHerby } from '../model/dto/get-test-herby'
import { UpdateTestDto } from '../model/dto/update-tests.dto'
import { Test } from '../model/entities/test.entity'
import { TestTemplate } from '../model/entities/test-template.entity'

const STRUCTURAL_LOCK_MESSAGE =
  'Não é possível alterar a estrutura do teste pois já existem lançamentos.'

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
    @InjectRepository(AnswerKeyChangeLog)
    private answerKeyChangeLogRepository: Repository<AnswerKeyChangeLog>,

    @InjectConnection()
    private readonly connection: Connection,

    private configService: ConfigService,
    @Inject(REPROCESS_DISPATCHER)
    private reprocessDispatcher: ReprocessDispatcher,
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
      .createQueryBuilder('TESTE')
      .select([
        'TESTE.TES_ID',
        'TESTE.TES_NOME',
        'TESTE.TES_ANO',
        'TES_DIS.DIS_NOME',
        'TES_SER.SER_NOME',
      ])
      .leftJoin('TESTE.TES_DIS', 'TES_DIS')
      .leftJoin('TESTE.TES_SER', 'TES_SER')
      .orderBy(column ?? 'TESTE.TES_NOME', order)

    if (year) {
      queryBuilder.andWhere('TESTE.TES_ANO = :year', { year })
    }

    if (serie) {
      queryBuilder.andWhere('TES_SER.SER_ID = :serie', { serie })
    }

    if (subject) {
      queryBuilder.andWhere('TES_DIS.DIS_ID = :subject', { subject })
    }

    if (search) {
      queryBuilder.andWhere(
        '(TESTE.TES_NOME LIKE :search OR TES_DIS.DIS_NOME LIKE :search OR TES_SER.SER_NOME LIKE :search)',
        { search: `%${search}%` },
      )
    }

    return paginateRaw<Test>(queryBuilder, { page, limit })
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
    await this.verifyStructuralLock(TES_ID, updateTestDto)
    const items = updateTestDto.TES_TEG
    delete updateTestDto.TES_TEG
    const test = await this.findOne(TES_ID)

    let updateTest = await this.testRepository.save(
      { ...updateTestDto, TES_ID },
      { data: user },
    )
    updateTest = {
      ...updateTest,
      TES_TEG: test?.TES_TEG,
    }

    if (Array.isArray(items)) {
      await this.saveTemplates(updateTest, items, user)
    }

    return updateTest
  }

  async toggleActive(id: number): Promise<{
    active: boolean
  }> {
    const test = await this.findOne(id, ['assessmentOnline'])

    if (test.TES_ATIVO) {
      await this.verifyStudentInTest(id)
    }

    const toggleActive = !test.TES_ATIVO

    try {
      await this.testRepository.update(test.TES_ID, {
        TES_ATIVO: toggleActive,
      })
      if (!toggleActive && test?.assessmentOnline) {
        await this.connection
          .getRepository(AssessmentOnline)
          .update(test.assessmentOnline.id, {
            active: false,
          })
      }
    } catch (e) {
      throw new InternalServerError()
    }

    return {
      active: toggleActive,
    }
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
      })

    if (verifyStudent) {
      throw new ForbiddenException(
        'Você não pode executar esta ação no momento. Pois a avaliação ja está em uso.',
      )
    }
  }

  private async verifyStructuralLock(
    testId: number,
    dto: UpdateTestDto,
  ): Promise<void> {
    const hasLaunch = await this.connection
      .getRepository(StudentTest)
      .findOne({ where: { ALT_TES: { TES_ID: testId } } })

    if (!hasLaunch) return

    const current = await this.findOne(testId)
    const savedTemplates = await this.findTemplates(testId)

    if (dto.TES_ANO !== undefined && dto.TES_ANO !== current.TES_ANO) {
      throw new ForbiddenException(STRUCTURAL_LOCK_MESSAGE)
    }

    const currentDisId =
      (current.TES_DIS as any)?.DIS_ID ?? current.TES_DIS ?? null
    const dtoDisId = (dto.TES_DIS as any)?.DIS_ID ?? dto.TES_DIS ?? null

    if (dto.TES_DIS !== undefined && dtoDisId !== currentDisId) {
      throw new ForbiddenException(STRUCTURAL_LOCK_MESSAGE)
    }

    const currentSerId =
      (current.TES_SER as any)?.SER_ID ?? current.TES_SER ?? null
    const dtoSerId = (dto.TES_SER as any)?.SER_ID ?? dto.TES_SER ?? null

    if (dto.TES_SER !== undefined && dtoSerId !== currentSerId) {
      throw new ForbiddenException(STRUCTURAL_LOCK_MESSAGE)
    }

    const currentMarId =
      (current.TES_MAR as any)?.MAR_ID ?? current.TES_MAR ?? null
    const dtoMarId = (dto.TES_MAR as any)?.MAR_ID ?? dto.TES_MAR ?? null

    if (dto.TES_MAR !== undefined && dtoMarId !== currentMarId) {
      throw new ForbiddenException(STRUCTURAL_LOCK_MESSAGE)
    }

    if (!Array.isArray(dto.TES_TEG)) return

    const savedIds = new Set(savedTemplates.map((t) => t.TEG_ID))
    const dtoIds = new Set(
      dto.TES_TEG.filter((t: TestTemplate) => t.TEG_ID != null).map(
        (t: TestTemplate) => t.TEG_ID,
      ),
    )

    const hasAddition = dto.TES_TEG.some((t: TestTemplate) => t.TEG_ID == null)
    const hasRemoval = [...savedIds].some((id) => !dtoIds.has(id as number))

    if (hasAddition || hasRemoval) {
      throw new ForbiddenException(STRUCTURAL_LOCK_MESSAGE)
    }
  }

  async saveTemplates(
    updateTest: Test,
    items: TestTemplate[],
    user?: User,
  ): Promise<TestTemplate[]> {
    const oldByid = new Map<number, TestTemplate>()
    for (const oldTemplate of updateTest?.TES_TEG ?? []) {
      if (oldTemplate?.TEG_ID) oldByid.set(oldTemplate.TEG_ID, oldTemplate)
    }

    for (const oldTemplate of updateTest?.TES_TEG ?? []) {
      const existsTemplate = items.find(
        (template) => template?.TEG_ID === oldTemplate.TEG_ID,
      )

      if (!existsTemplate) {
        await this.testTemplatesRepository.delete(oldTemplate.TEG_ID)
      }
    }

    return Promise.all(
      (items ?? []).map(async (template: TestTemplate) => {
        const withParent = template?.TEG_TES
          ? template
          : { ...template, TEG_TES: updateTest }
        const previous = withParent?.TEG_ID
          ? oldByid.get(withParent.TEG_ID)
          : null

        const saved = await this.testTemplatesRepository.save(withParent)
        if (previous) {
          await this.logAndEmitAnswerKeyChanges(previous, withParent, user)
        }
        return saved
      }),
    )
  }

  private async logAndEmitAnswerKeyChanges(
    previous: TestTemplate,
    current: TestTemplate,
    user?: User,
  ): Promise<void> {
    const changes: Array<{
      field: AnswerKeyChangeField
      previousValue: string | null
      newValue: string
    }> = []

    if (
      (previous.TEG_RESPOSTA_CORRETA ?? null) !==
      (current.TEG_RESPOSTA_CORRETA ?? null)
    ) {
      changes.push({
        field: AnswerKeyChangeField.RESPOSTA_CORRETA,
        previousValue: previous.TEG_RESPOSTA_CORRETA ?? null,
        newValue: current.TEG_RESPOSTA_CORRETA ?? '',
      })
    }

    const prevAnulada = !!previous.TEG_ANULADA
    const newAnulada = !!current.TEG_ANULADA
    if (prevAnulada !== newAnulada) {
      changes.push({
        field: AnswerKeyChangeField.ANULADA,
        previousValue: String(prevAnulada),
        newValue: String(newAnulada),
      })
    }

    const prevMtiId = previous.TEG_MTI?.MTI_ID ?? null
    const rawNewMti = (current as any).TEG_MTI
    const newMtiId =
      (typeof rawNewMti === 'object' && rawNewMti !== null
        ? rawNewMti.MTI_ID
        : typeof rawNewMti === 'number'
          ? rawNewMti
          : undefined) ??
      (current as any).TEG_MTI_ID ??
      null
    if (prevMtiId !== newMtiId) {
      changes.push({
        field: AnswerKeyChangeField.DESCRITOR,
        previousValue: prevMtiId !== null ? String(prevMtiId) : null,
        newValue: newMtiId !== null ? String(newMtiId) : '',
      })
    }

    for (const change of changes) {
      const log = this.answerKeyChangeLogRepository.create({
        testTemplateId: current.TEG_ID,
        field: change.field,
        previousValue: change.previousValue,
        newValue: change.newValue,
        changedByUserId: user?.USU_ID ?? null,
      })
      const saved = await this.answerKeyChangeLogRepository.save(log)
      await this.reprocessDispatcher.scheduleDebounce(current.TEG_ID, saved.id)
    }
  }

  async add(createTestDto: CreateTestDto, user: User) {
    await this.verifyTestExists(createTestDto)

    try {
      const createTest = await this.testRepository.save(createTestDto, {
        data: user,
      })
      await this.saveTemplates(createTest, createTest.TES_TEG)
      return createTest
    } catch (e) {
      throw new InternalServerError()
    }
  }

  /**
   * Buscar um teste com base no id
   * @param id informação referente a identificação do teste
   * @returns retorna o teste pesquisado
   */
  async findOne(
    id: number,
    relations = ['TES_DIS', 'TES_SER', 'TES_MAR', 'assessmentOnline'],
  ) {
    const test = await this.testRepository.findOne(
      { TES_ID: id },
      { relations },
    )

    if (!test) {
      throw new NotFoundException('Teste não encontrado.')
    }

    const getTemplates = await this.findTemplates(test.TES_ID)
    const templates = await Promise.all(
      getTemplates.map(async (template) => {
        return template
      }),
    )

    test.TES_TEG = templates

    const launch = await this.connection
      .getRepository(StudentTest)
      .findOne({ where: { ALT_TES: { TES_ID: id } } })
    test.hasLaunches = !!launch

    return test
  }

  /**
   * Retorna todos os teste por ano
   *
   * @returns retorna uma lista de teste
   */
  async findYears(ano: string): Promise<Test[]> {
    const tests = await this.testRepository
      .createQueryBuilder('Test')
      .innerJoinAndSelect('Test.TES_DIS', 'TES_DIS')
      .leftJoin('Test.TES_ASSESMENTS', 'TES_ASSESMENTS')
      .where('Test.TES_ANO = :year', { year: ano })
      .andWhere('Test.TES_ATIVO = TRUE')
      .andWhere('TES_ASSESMENTS.AVA_ID IS NULL')
      .orderBy('Test.TES_NOME', 'ASC')
      .getMany()

    return tests
  }

  async generateCard(id: number, getTestHerby: GetTestHerby) {
    const test = await this.findOne(id)

    if (test?.TES_DIS?.DIS_TIPO === SubjectTypeEnum?.OBJETIVA) {
      return this.findOneByHerby(id, getTestHerby)
    }

    let county = null

    if (getTestHerby?.schoolId) {
      const school = await this.connection.getRepository(School).findOne({
        where: {
          ESC_ID: getTestHerby?.schoolId,
        },
        relations: ['ESC_MUN'],
      })

      county = school.ESC_MUN
    }

    county = await this.connection.getRepository(County).findOne({
      where: {
        MUN_ID: getTestHerby?.countyId,
      },
    })

    if (!county) {
      throw new NotFoundException('Município nao encontrado')
    }

    if (county?.MUN_LEITURA_HERBY_ATIVO) {
      return this.findOneByHerby(id, getTestHerby)
    }

    return this.findOneByEdler(id, getTestHerby)
  }

  async findOneByHerby(id: number, getTestHerby: GetTestHerby) {
    const { countyId, schoolId } = getTestHerby

    const test = await this.findOne(id)

    const { students } = await this.getManyStudentsForReleaseTests(
      test.TES_SER.SER_ID,
      test.TES_ANO,
      countyId,
      schoolId,
    )

    const serie = serieNames[test.TES_SER.SER_NUMBER]

    const { userUploadInfos } = mapperUsersUploadInfoByHerby(students, serie)

    const formattedTest = {
      provider: 'herby',
      idProvaPt: test.TES_ID,
      userUploadInfos,
    }

    return formattedTest
  }

  async findOneByEdler(id: number, getTestHerby: GetTestHerby) {
    const { countyId, schoolId } = getTestHerby

    const test = await this.findOne(id)

    const { students } = await this.getManyStudentsForReleaseTests(
      test.TES_SER.SER_ID,
      test.TES_ANO,
      countyId,
      schoolId,
    )

    const serie = serieNumbers[test.TES_SER.SER_NUMBER]

    const dataGroupped = _.groupBy(students, (student) => student?.TUR_ID)

    const keyTurmas = Object.keys(dataGroupped)

    const classes = keyTurmas.map((key) => {
      const student = dataGroupped[key][0]

      const students = dataGroupped[key].map((line) => {
        return {
          foreignId: String(line.ALU_ID),
          name: line.ALU_NOME,
        }
      })

      return {
        className: student?.TUR_NOME,
        schoolName: student?.ESC_NOME,
        cityName: student?.MUN_NOME,
        grade: serie,
        foreignClassId: String(student?.TUR_ID),
        foreignSchoolId: String(student?.ESC_ID),
        foreignCityId: String(student?.MUN_ID),
        students,
      }
    })

    const formattedTest = {
      userId: this.configService.get<string>('USER_SAEV_EDLER'),
      testId: String(test.TES_ID),
      classes,
      provider: 'edler',
    }

    return formattedTest
  }

  async findTemplates(TES_ID: number) {
    return this.testTemplatesRepository.find({
      where: { TEG_TES: { TES_ID } },
      relations: ['TEG_MTI'],
      order: { TEG_ORDEM: 'ASC' },
    })
  }

  async verifyTestExists(createTestDto: CreateTestDto) {
    const test = await this.testRepository.findOne({
      TES_NOME: createTestDto.TES_NOME,
      TES_DIS: createTestDto.TES_DIS,
      TES_SER: createTestDto.TES_SER,
      TES_ANO: createTestDto.TES_ANO,
    })

    if (test) {
      throw new ConflictException('Teste já cadastrado.')
    }
  }

  async updateFile(
    TES_ID: number,
    filename: string,
    base64: string,
    user: User,
  ): Promise<string> {
    const test = await this.testRepository.findOne({ TES_ID })
    const folderName = './public/test/file/'
    const newFileName = editFileName(filename)
    if (test) {
      test.TES_ARQUIVO = newFileName
      writeFileSync(`${folderName}${newFileName}`, base64, {
        encoding: 'base64',
      })
      await this.update(TES_ID, test, user)
      return newFileName
    } else {
      throw new HttpException(
        'Não é possível gravar este arquivo.',
        HttpStatus.BAD_GATEWAY,
      )
    }
  }

  async updateManual(
    TES_ID: number,
    filename: string,
    base64: string,
    user: User,
  ): Promise<string> {
    const test = await this.testRepository.findOne({ TES_ID })
    const folderName = './public/test/manual/'
    const newFileName = editFileName(filename)
    if (test) {
      test.TES_MANUAL = newFileName
      writeFileSync(`${folderName}${newFileName}`, base64, {
        encoding: 'base64',
      })
      await this.update(TES_ID, test, user)
      return newFileName
    } else {
      throw new HttpException(
        'Não é possível gravar este manual.',
        HttpStatus.BAD_GATEWAY,
      )
    }
  }

  async getTestsWithAssessmentOnline(
    paginationParams: PaginationParams,
    user: User,
  ) {
    const { limit, page, search, serie } = paginationParams

    const formattedInitialDate = new Date()
    formattedInitialDate.setUTCHours(23, 59, 59, 999)

    const finalDate = new Date()

    const queryBuilder = this.testRepository
      .createQueryBuilder('Tests')
      .select([
        'Tests',
        'assessmentOnline.id',
        'TES_ASSESMENTS.AVA_ID',
        'TES_SER.SER_ID',
        'TES_SER.SER_NOME',
        'TES_DIS.DIS_ID',
        'TES_DIS.DIS_NOME',
      ])
      .innerJoin('Tests.TES_ASSESMENTS', 'TES_ASSESMENTS')
      .innerJoin('Tests.assessmentOnline', 'assessmentOnline')
      .innerJoin('Tests.TES_SER', 'TES_SER')
      .innerJoin('Tests.TES_DIS', 'TES_DIS')
      .innerJoinAndSelect('TES_ASSESMENTS.AVA_AVM', 'AVA_AVM')
      .innerJoinAndSelect('AVA_AVM.AVM_MUN', 'AVM_MUN')
      .andWhere(
        'DATE_SUB(AVA_AVM.AVM_DT_INICIO, INTERVAL 3 HOUR) <= :initialDate',
        { initialDate: formattedInitialDate },
      )
      .andWhere('DATE_SUB(AVA_AVM.AVM_DT_FIM, INTERVAL 3 HOUR) >= :finalDate', {
        finalDate,
      })
      .andWhere('Tests.TES_ATIVO = TRUE')
      .andWhere('assessmentOnline.active = TRUE')
      .andWhere('AVM_MUN.MUN_ID = :county', { county: user?.USU_MUN?.MUN_ID })
      .orderBy('Tests.TES_DT_CRIACAO', 'DESC')

    if (serie) {
      queryBuilder.andWhere('TES_SER.SER_ID = :serie', { serie })
    }

    if (search) {
      queryBuilder.andWhere('Tests.TES_NOME LIKE :q', {
        q: `%${search}%`,
      })
    }

    const data = await paginateData(page, limit, queryBuilder)

    const { items } = mapperTestsWithAssessmentOnline(data.items)

    return {
      ...data,
      items,
    }
  }

  async findOneQuestion(questionId: number) {
    const question = await this.testTemplatesRepository.findOne({
      where: {
        TEG_ID: questionId,
      },
    })

    if (!question) {
      throw new NotFoundException()
    }

    return {
      question,
    }
  }

  async deleteQuestion(questionId: number) {
    const { question } = await this.findOneQuestion(questionId)

    const questionWithParent = await this.testTemplatesRepository.findOne({
      where: { TEG_ID: questionId },
      relations: ['TEG_TES'],
    })

    if (!questionWithParent?.TEG_TES?.TES_ID) {
      throw new InternalServerErrorException('Question has no parent test.')
    }

    const hasLaunch = await this.connection.getRepository(StudentTest).findOne({
      where: { ALT_TES: { TES_ID: questionWithParent.TEG_TES.TES_ID } },
    })

    if (hasLaunch) {
      throw new ForbiddenException(STRUCTURAL_LOCK_MESSAGE)
    }

    const studentTestAnswer = await this.studentTestAnswerRepository.findOne({
      where: {
        questionTemplate: question.TEG_ID,
      },
    })

    if (studentTestAnswer) {
      throw new ForbiddenException(
        'Você não pode deletar essa questão pois está em uso.',
      )
    }

    return {
      verify: true,
    }
  }

  async getManyStudentsForReleaseTests(
    serieId: number,
    year: string,
    countyId: number | null,
    schoolId: number | null,
  ) {
    const queryBuilderStudents = this.studentRepository
      .createQueryBuilder('Students')
      .select([
        'Students.ALU_ID as ALU_ID',
        'Students.ALU_NOME as ALU_NOME',
        'ALU_TUR.TUR_ID as TUR_ID',
        'ALU_TUR.TUR_NOME as TUR_NOME',
        'ALU_TUR.TUR_PERIODO as TUR_PERIODO',
        'ALU_ESC.ESC_ID as ESC_ID',
        'ALU_ESC.ESC_NOME as ESC_NOME',
        'ALU_ESC.ESC_INEP as ESC_INEP',
        'ALU_ESC.ESC_TIPO as ESC_TIPO',
        'ESC_MUN.MUN_ID as MUN_ID',
        'ESC_MUN.MUN_NOME as MUN_NOME',
        'ESC_MUN.MUN_COD_IBGE as MUN_COD_IBGE',
        'StateRegional.name as regionalEstadualName',
        'MunicipalRegional.name as regionalMunicipalName',
        'State.name as stateName',
      ])
      .innerJoin('Students.ALU_ESC', 'ALU_ESC')
      .innerJoin('Students.ALU_TUR', 'ALU_TUR')
      .innerJoin('ALU_ESC.ESC_MUN', 'ESC_MUN')
      .leftJoin('ESC_MUN.stateRegional', 'StateRegional')
      .leftJoin('ALU_ESC.regional', 'MunicipalRegional')
      .innerJoin('ESC_MUN.state', 'State')
      .where('Students.ALU_ATIVO = 1')
      .andWhere('Students.ALU_SER_ID = :serieId', {
        serieId,
      })

    if (year) {
      queryBuilderStudents.andWhere('ALU_TUR.TUR_ANO = :year', { year })
    }

    if (countyId) {
      queryBuilderStudents.andWhere('ESC_MUN.MUN_ID = :countyId', { countyId })
    }

    if (schoolId) {
      queryBuilderStudents.andWhere('ALU_ESC.ESC_ID = :schoolId', {
        schoolId,
      })
    }

    const students = await queryBuilderStudents.getRawMany()

    return {
      students,
    }
  }
}
