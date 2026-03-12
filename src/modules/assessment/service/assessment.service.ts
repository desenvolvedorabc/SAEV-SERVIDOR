import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { isPast, subDays } from 'date-fns'
import { paginateRaw, Pagination } from 'nestjs-typeorm-paginate'
import { PaginationParams } from 'src/helpers/params'
import { County } from 'src/modules/counties/model/entities/county.entity'
import { NotificationsService } from 'src/modules/notifications/service/notification.service'
import { Test } from 'src/modules/test/model/entities/test.entity'
import { User } from 'src/modules/user/model/entities/user.entity'
import { RoleProfile } from 'src/shared/enums/role.enum'
import { InternalServerError } from 'src/utils/errors'
import { formatParamsByProfile } from 'src/utils/format-params-by-profile'
import { paginateData } from 'src/utils/paginate-data'
import { Repository } from 'typeorm'
import { Transactional } from 'typeorm-transactional-cls-hooked'

import { ChangeValuationDateDTO } from '../model/dto/change-valuation-date.dto'
import { CreateAssessmentDto } from '../model/dto/create-assessment.dto'
import { UpdateAssessmentDto } from '../model/dto/update-assessment.dto'
import { Assessment } from '../model/entities/assessment.entity'
import { AssessmentCounty } from '../model/entities/assessment-county.entity'
import { EditionTypeEnum } from '../model/enum/edition-type.enum'
import { TypeAssessmentEnum } from '../model/enum/type-assessment.enum'

@Injectable()
export class AssessmentsService {
  constructor(
    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,
    @InjectRepository(AssessmentCounty)
    private assessmentCountiesRepository: Repository<AssessmentCounty>,
    @InjectRepository(County)
    private countyRepository: Repository<County>,
    @InjectRepository(Test)
    private testsRepository: Repository<Test>,
    private notificationsService: NotificationsService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findByReleaseResults(params: PaginationParams, user: User) {
    const { page, limit } = params
    const { queryBuilder } = this.getQueryBuilderForPaginateAssessments(
      params,
      user,
    )

    return await paginateData<Assessment>(page, limit, queryBuilder)
  }

  async paginate(
    params: PaginationParams,
    user: User,
  ): Promise<Pagination<Assessment>> {
    const { page, limit } = params
    const { queryBuilder } = this.getQueryBuilderForPaginateAssessments(
      params,
      user,
    )

    const selectQueryBuilder = queryBuilder
      .select([
        'Assessments.AVA_ID',
        'Assessments.AVA_NOME',
        'Assessments.AVA_ANO',
        'GROUP_CONCAT(MUN.MUN_NOME SEPARATOR "|") as `AVALIACAO_MUNICIPIO`',
        'GROUP_CONCAT(CONCAT(TES_SER.SER_NOME,": ",TES_DIS.DIS_NOME) SEPARATOR "|") as `AVALIACAO_TESTE`',
      ])
      .groupBy('Assessments.AVA_ID')

    return await paginateRaw<Assessment>(selectQueryBuilder, { page, limit })
  }

  @Transactional()
  async add(createAssessmentDto: CreateAssessmentDto, user: User) {
    const counties = createAssessmentDto.AVA_AVM || []

    await this.assessmentExists(createAssessmentDto)

    if (createAssessmentDto.AVA_DT_INICIO && createAssessmentDto.AVA_DT_FIM) {
      const editionStart = new Date(createAssessmentDto.AVA_DT_INICIO)
      const editionEnd = new Date(createAssessmentDto.AVA_DT_FIM)

      if (editionStart >= editionEnd) {
        throw new BadRequestException(
          'A data de início deve ser menor que a data de fim da edição.',
        )
      }

      if (isPast(editionEnd)) {
        throw new BadRequestException(
          'A data de fim da edição não pode estar no passado.',
        )
      }
    }

    for (const county of counties) {
      if (county?.AVM_DT_INICIO && county?.AVM_DT_FIM) {
        const countyEntity = await this.countyRepository.findOne({
          where: { MUN_ID: county.id },
        })

        const { assessmentCounty } = await this.verifyExistsAssessmentCounty({
          countyId: county.id,
          assessmentId: null,
          dateInitial: county.AVM_DT_INICIO,
          dateFinal: county.AVM_DT_FIM,
          type: county.AVM_TIPO,
        })

        if (assessmentCounty) {
          throw new ForbiddenException(
            `Já existe uma avaliação nesse período para o município de ${countyEntity?.MUN_NOME || county.id}.`,
          )
        }
      }
    }

    try {
      const createAssessment = await this.assessmentRepository.save(
        {
          AVA_NOME: createAssessmentDto.AVA_NOME,
          AVA_ANO: createAssessmentDto.AVA_ANO,
          AVA_ATIVO: createAssessmentDto.AVA_ATIVO,
          AVA_DT_INICIO: createAssessmentDto.AVA_DT_INICIO,
          AVA_DT_FIM: createAssessmentDto.AVA_DT_FIM,
          AVA_TIPO: createAssessmentDto.AVA_TIPO,
          AVA_TES: createAssessmentDto.AVA_TES,
        },
        {
          data: user,
        },
      )

      if (counties.length > 0) {
        await this.associateCountiesToAssessment(
          createAssessment,
          counties,
          user,
        )
      }

      if (createAssessment.AVA_TIPO === EditionTypeEnum.GERAL) {
        this.notifyAllCountiesAboutNewAssessment()
      } else if (
        createAssessment.AVA_TIPO === EditionTypeEnum.ESPECIFICO &&
        counties.length > 0
      ) {
        this.notifySpecificCountiesAboutNewAssessment(counties)
      }

      return createAssessment
    } catch (e) {
      throw new InternalServerError()
    }
  }

  @Transactional()
  async update(
    id: number,
    updateAssessmentDto: UpdateAssessmentDto,
    user: User,
  ): Promise<Assessment> {
    const assessment = await this.findOne(id)

    const counties = updateAssessmentDto.AVA_AVM || []

    if (updateAssessmentDto.AVA_DT_INICIO && updateAssessmentDto.AVA_DT_FIM) {
      const editionStart = new Date(updateAssessmentDto.AVA_DT_INICIO)
      const editionEnd = new Date(updateAssessmentDto.AVA_DT_FIM)

      if (editionStart >= editionEnd) {
        throw new BadRequestException(
          'A data de início deve ser menor que a data de fim da edição.',
        )
      }

      if (isPast(editionEnd)) {
        throw new BadRequestException(
          'A data de fim da edição não pode estar no passado.',
        )
      }
    }

    for (const county of counties) {
      if (county?.AVM_DT_INICIO && county?.AVM_DT_FIM) {
        const countyEntity = await this.countyRepository.findOne({
          where: { MUN_ID: county.id },
        })

        const { assessmentCounty } = await this.verifyExistsAssessmentCounty({
          countyId: county.id,
          assessmentId: id,
          dateInitial: county.AVM_DT_INICIO,
          dateFinal: county.AVM_DT_FIM,
          type: county.AVM_TIPO,
        })

        if (assessmentCounty) {
          throw new ForbiddenException(
            `Já existe uma avaliação nesse período para o município de ${countyEntity?.MUN_NOME || county.id}.`,
          )
        }
      }
    }

    try {
      const updated = await this.assessmentRepository.save(
        {
          ...assessment,
          ...updateAssessmentDto,
          AVA_ID: assessment.AVA_ID,
        },
        {
          data: user,
        },
      )

      if (counties.length > 0) {
        const newCounties = counties.filter(
          (county) => !county.assessmentCountyId,
        )

        await this.associateCountiesToAssessment(updated, counties, user)

        if (
          newCounties.length > 0 &&
          updated.AVA_TIPO === EditionTypeEnum.ESPECIFICO
        ) {
          this.notifySpecificCountiesAboutNewAssessment(newCounties)
        }
      }

      return updated
    } catch (e) {
      throw new InternalServerError()
    }
  }

  async changeValuationDate(
    { counties, newDate }: ChangeValuationDateDTO,
    id: number,
    user: User,
  ) {
    const assessment = await this.findOne(id)
    const formattedFinalDate = new Date(newDate)

    if (isPast(new Date(formattedFinalDate.toDateString()))) {
      throw new BadRequestException('Informe uma data maior que a data atual')
    }

    for (const county of counties) {
      const assessmentCountyDate = await this.assessmentCountiesRepository
        .createQueryBuilder('county')
        .innerJoin('county.AVM_MUN', 'AVM_MUN')
        .innerJoin('county.AVM_AVA', 'AVM_AVA')
        .where('AVM_MUN.MUN_ID = :countyId', { countyId: county.id })
        .andWhere('AVM_AVA.AVA_ID = :id', { id: assessment.AVA_ID })
        .andWhere('county.AVM_TIPO = :type', { type: county.type })
        .getOne()

      if (assessmentCountyDate.AVM_DT_INICIO > formattedFinalDate) {
        throw new ForbiddenException(
          'Informe uma data maior que a data de início.',
        )
      }

      const { assessmentCounty } = await this.verifyExistsAssessmentCounty({
        countyId: county.id,
        assessmentId: assessment.AVA_ID,
        dateInitial: assessmentCountyDate.AVM_DT_INICIO,
        dateFinal: formattedFinalDate,
        type: assessmentCountyDate.AVM_TIPO,
      })

      if (assessmentCounty) {
        throw new ForbiddenException('Já existe uma avaliação nesse período.')
      }
    }

    for (const county of counties) {
      const assessmentCounty = await this.assessmentCountiesRepository.findOne({
        where: {
          AVM_MUN: {
            MUN_ID: county.id,
          },
          AVM_AVA: {
            AVA_ID: assessment.AVA_ID,
          },
          AVM_TIPO: county.type,
        },
      })

      if (assessmentCounty) {
        await this.assessmentCountiesRepository.save(
          { ...assessmentCounty, AVM_DT_FIM: formattedFinalDate },
          {
            data: user,
          },
        )
      }
    }
  }

  async getTestsByFilter(paginationParams: PaginationParams) {
    const { county, school, limit, page, search } = paginationParams

    const formattedInitialDate = new Date()
    formattedInitialDate.setUTCHours(23, 59, 59, 999)

    const finalDate = new Date()

    const testsQuery = this.testsRepository
      .createQueryBuilder('Tests')
      .leftJoinAndSelect('Tests.TES_ASSESMENTS', 'TES_ASSESMENTS')
      .leftJoinAndSelect('Tests.TES_DIS', 'TES_DIS')
      .leftJoinAndSelect('Tests.TES_SER', 'TES_SER')
      .leftJoinAndSelect('TES_ASSESMENTS.AVA_AVM', 'AVA_AVM')
      .leftJoinAndSelect('AVA_AVM.AVM_MUN', 'AVM_MUN')
      .leftJoin('AVM_MUN.schools', 'schools')
      .andWhere(
        'DATE_SUB(AVA_AVM.AVM_DT_DISPONIVEL, INTERVAL 3 HOUR) <= :initialDate',
        { initialDate: formattedInitialDate },
      )
      .andWhere('DATE_SUB(AVA_AVM.AVM_DT_FIM, INTERVAL 3 HOUR) >= :finalDate', {
        finalDate,
      })
      .orderBy('Tests.TES_DT_CRIACAO', 'DESC')

    if (county) {
      testsQuery.andWhere('AVM_MUN.MUN_ID = :county', { county })
    }

    if (school) {
      testsQuery.andWhere('schools.ESC_ID = :school', { school })
    }

    if (search) {
      testsQuery.andWhere('TES_ASSESMENTS.AVA_NOME LIKE :q', {
        q: `%${search}%`,
      })
    }

    const data = await paginateData(page, limit, testsQuery)

    const formattedData = data.items.map((test) => {
      return {
        id: test.TES_ID,
        name: test.TES_NOME,
        serie: test.TES_SER.SER_NOME,
        subject: test.TES_DIS.DIS_NOME,
        manual: test.TES_MANUAL,
        file: test.TES_ARQUIVO,
        edition: test.TES_ASSESMENTS[0].AVA_NOME,
        availableAt: test.TES_ASSESMENTS[0].AVA_AVM[0]?.AVM_DT_DISPONIVEL,
        endsAt: test.TES_ASSESMENTS[0].AVA_AVM[0]?.AVM_DT_FIM,
        startAt: test.TES_ASSESMENTS[0].AVA_AVM[0]?.AVM_DT_INICIO,
      }
    })

    return {
      ...data,
      items: formattedData,
    }
  }

  private async associateCountiesToAssessment(
    assessment: Assessment,
    counties: Array<{
      id: number
      AVM_TIPO: TypeAssessmentEnum
      AVM_DT_INICIO?: Date
      AVM_DT_FIM?: Date
      AVM_DT_DISPONIVEL?: Date
    }>,
    user: User,
  ): Promise<void> {
    for (const countyDto of counties) {
      const county = await this.countyRepository.findOne({
        where: { MUN_ID: countyDto.id },
      })

      if (!county) {
        throw new NotFoundException(
          `Município com ID ${countyDto.id} não encontrado.`,
        )
      }

      const existingAssessmentCounty =
        await this.assessmentCountiesRepository.findOne({
          where: {
            AVM_MUN: { MUN_ID: countyDto.id },
            AVM_AVA: { AVA_ID: assessment.AVA_ID },
            AVM_TIPO: countyDto.AVM_TIPO,
          },
        })

      const assessmentCounty = existingAssessmentCounty
        ? {
          ...existingAssessmentCounty,
          AVM_DT_INICIO: countyDto.AVM_DT_INICIO || null,
          AVM_DT_FIM: countyDto.AVM_DT_FIM || null,
          AVM_DT_DISPONIVEL: countyDto.AVM_DT_DISPONIVEL || null,
        }
        : this.assessmentCountiesRepository.create({
          AVM_AVA: assessment,
          AVM_MUN: county,
          AVM_TIPO: countyDto.AVM_TIPO,
          AVM_ATIVO: true,
          AVM_DT_INICIO: countyDto.AVM_DT_INICIO || null,
          AVM_DT_FIM: countyDto.AVM_DT_FIM || null,
          AVM_DT_DISPONIVEL: countyDto.AVM_DT_DISPONIVEL || null,
        })

      await this.assessmentCountiesRepository.save(assessmentCounty, {
        data: user,
      })
    }
  }

  async saveItems(updateAssessment: Assessment) {
    await Promise.all(
      updateAssessment?.AVA_AVM?.map(async (counties: any) => {
        if (!counties.AVM_AVA) {
          counties = {
            ...counties,
            AVM_AVA: updateAssessment,
          }
        }
        delete counties?.id

        const county = await this.countyRepository.findOne({
          MUN_ID: counties.AVM_MUN_ID,
        })

        counties.AVM_MUN = county
        this.assessmentCountiesRepository.save(counties).then(() => {
          return counties
        })
      }),
    )
  }

  async findOne(id: number) {
    const assessment = await this.assessmentRepository.findOne(
      { AVA_ID: id },
      { relations: ['AVA_TES'] },
    )

    if (!assessment) {
      throw new NotFoundException('Avaliação não encontrada.')
    }

    const getItems = await this.findItems(assessment.AVA_ID)

    const items = await Promise.all(
      getItems.map(async (template) => {
        return template
      }),
    )

    assessment.AVA_AVM = items
    return assessment
  }

  async findItems(AVA_ID: number) {
    return this.assessmentCountiesRepository.find({
      where: { AVM_AVA: { AVA_ID } },
    })
  }

  async assessmentExists(createAssessmentDto: CreateAssessmentDto) {
    const assessment = await this.assessmentRepository.findOne({
      AVA_NOME: createAssessmentDto.AVA_NOME,
      AVA_ANO: createAssessmentDto.AVA_ANO,
      AVA_ATIVO: true,
    })

    if (assessment) {
      throw new ConflictException('Avaliação já cadastrada.')
    }
  }

  /**
   * Retorna todos as edições por ano
   *
   * @returns retorna uma lista de edições
   */
  findYears(ano: string, user: User): Promise<Assessment[]> {
    if (user.USU_SPE.SPE_PER.PER_NOME !== 'SAEV') {
      return this.assessmentRepository
        .createQueryBuilder('Assessment')
        .leftJoinAndSelect('Assessment.AVA_AVM', 'AVA_AVM')
        .leftJoinAndSelect('AVA_AVM.AVM_MUN', 'AVM_MUN')
        .orderBy('Assessment.AVA_NOME', 'ASC')
        .where('Assessment.AVA_ANO = :year', { year: ano })
        .andWhere('AVM_MUN.MUN_ID = :county', { county: user?.USU_MUN?.MUN_ID })
        .getMany()
    }

    return this.assessmentRepository.find({
      order: { AVA_NOME: 'ASC' },
      where: { AVA_ANO: ano },
      relations: ['AVA_AVM'],
    })
  }

  async getTests(school?: string, countyId?: number) {
    const formattedInitialDate = new Date()
    formattedInitialDate.setUTCHours(23, 59, 59, 999)

    const finalDate = new Date()

    const testsQuery = this.testsRepository
      .createQueryBuilder('tests')
      .leftJoin('tests.TES_ASSESMENTS', 'TES_ASSESMENTS')
      .leftJoin('TES_ASSESMENTS.AVA_AVM', 'AVA_AVM')
      .leftJoin('AVA_AVM.AVM_MUN', 'AVM_MUN')
      .leftJoin('AVM_MUN.schools', 'schools')
      .andWhere(
        'DATE_SUB(AVA_AVM.AVM_DT_DISPONIVEL, INTERVAL 3 HOUR) <= :dateInitial',
        { dateInitial: formattedInitialDate },
      )
      .andWhere('DATE_SUB(AVA_AVM.AVM_DT_FIM, INTERVAL 3 HOUR) >= :finalDate', {
        finalDate,
      })

    if (countyId) {
      testsQuery.andWhere('AVM_MUN.MUN_ID = :county', { county: countyId })
    }

    if (school) {
      testsQuery.andWhere('schools.ESC_ID = :school', { school })
    }

    const total = testsQuery.getCount()

    return total
  }

  /**
   * Retorna todos os anos dos edições
   *
   * @returns retorna uma lista de edições
   */
  findAllYears(): Promise<Assessment[]> {
    return this.assessmentRepository
      .createQueryBuilder('AVALIACAO')
      .select('AVALIACAO.AVA_ANO AS ANO')
      .groupBy('AVALIACAO.AVA_ANO')
      .execute()
  }

  async verifyExistsAssessmentCounty({
    countyId,
    assessmentId,
    dateInitial,
    dateFinal,
    type,
  }: {
    countyId: number
    assessmentId: number | null
    dateInitial: Date
    dateFinal: Date
    type: TypeAssessmentEnum
  }) {
    const queryBuilder = await this.assessmentCountiesRepository
      .createQueryBuilder('AssessmentCounty')
      .innerJoin('AssessmentCounty.AVM_MUN', 'AVM_MUN')
      .innerJoin('AssessmentCounty.AVM_AVA', 'AVM_AVA')
      .where('AVM_MUN.MUN_ID = :countyId', { countyId })
      .andWhere('AssessmentCounty.AVM_TIPO = :type', { type })
      .andWhere(
        '((AssessmentCounty.AVM_DT_INICIO <= :dateInitial AND AssessmentCounty.AVM_DT_FIM >= :dateInitial) OR (AssessmentCounty.AVM_DT_INICIO <= :dateFinal AND AssessmentCounty.AVM_DT_FIM >= :dateFinal) OR (AssessmentCounty.AVM_DT_INICIO >= :dateInitial AND AssessmentCounty.AVM_DT_FIM <= :dateFinal))',
        {
          dateInitial,
          dateFinal,
        },
      )

    if (assessmentId) {
      queryBuilder.andWhere('AVM_AVA.AVA_ID != :assessmentId', {
        assessmentId,
      })
    }

    const assessmentCounty = await queryBuilder.getOne()

    return {
      assessmentCounty,
    }
  }

  async getAvailableAssessmentsForCounty(
    { page, limit, year }: PaginationParams,
    user: User,
  ) {
    const countyId = user?.USU_MUN?.MUN_ID
    const role = user?.USU_SPE?.role
    const typeAssessment =
      role === RoleProfile.MUNICIPIO_ESTADUAL
        ? TypeAssessmentEnum.ESTADUAL
        : TypeAssessmentEnum.MUNICIPAL

    const queryBuilder = this.assessmentRepository
      .createQueryBuilder('Assessment')
      .select([
        'Assessment.AVA_ID as AVA_ID',
        'Assessment.AVA_NOME as AVA_NOME',
        'Assessment.AVA_ANO as AVA_ANO',
        'Assessment.AVA_TIPO as AVA_TIPO',
      ])
      .leftJoin(
        'Assessment.AVA_AVM',
        'AVA_AVM',
        '(AVA_AVM.AVM_MUN_ID = :countyId and AVA_AVM.AVM_TIPO = :typeAssessment)',
        {
          countyId,
          typeAssessment,
        },
      )
      .where('Assessment.AVA_ATIVO IS TRUE')
      .andWhere(
        '(Assessment.AVA_TIPO = :geralType OR (Assessment.AVA_TIPO = :especificoType AND AVA_AVM.AVM_ID IS NOT NULL))',
        {
          geralType: EditionTypeEnum.GERAL,
          especificoType: EditionTypeEnum.ESPECIFICO,
        },
      )

    if (year) {
      queryBuilder.andWhere('Assessment.AVA_ANO = :year', { year })
    }

    queryBuilder.orderBy('Assessment.AVA_DT_CRIACAO', 'DESC')

    return paginateRaw(queryBuilder, { page, limit })
  }

  async getAssessmentForCounty(assessmentId: number, user: User) {
    const countyId = user?.USU_MUN?.MUN_ID
    const role = user?.USU_SPE?.role
    const typeAssessment =
      role === RoleProfile.MUNICIPIO_ESTADUAL
        ? TypeAssessmentEnum.ESTADUAL
        : TypeAssessmentEnum.MUNICIPAL

    const assessment = await this.assessmentRepository.findOne({
      where: { AVA_ID: assessmentId },
      relations: ['AVA_TES', 'AVA_TES.TES_SER', 'AVA_TES.TES_DIS'],
    })

    if (!assessment) {
      throw new NotFoundException('Avaliação não encontrada.')
    }

    if (assessment.AVA_TIPO === EditionTypeEnum.ESPECIFICO) {
      const countyAssessment = await this.assessmentCountiesRepository.findOne({
        where: {
          AVM_TIPO: typeAssessment,
          AVM_AVA: { AVA_ID: assessmentId },
          AVM_MUN: { MUN_ID: countyId },
        },
        relations: ['AVM_MUN'],
      })

      if (!countyAssessment) {
        throw new ForbiddenException(
          'Este município não está autorizado a acessar esta avaliação específica.',
        )
      }
    }

    const countyAssessment = await this.assessmentCountiesRepository.findOne({
      where: {
        AVM_TIPO: typeAssessment,
        AVM_AVA: { AVA_ID: assessmentId },
        AVM_MUN: { MUN_ID: countyId },
      },
      relations: ['AVM_MUN'],
    })

    if (!countyAssessment && assessment.AVA_TIPO === EditionTypeEnum.GERAL) {
      const county = await this.countyRepository.findOne({
        where: { MUN_ID: countyId },
      })

      return {
        assessment: {
          AVA_ID: assessment.AVA_ID,
          AVA_NOME: assessment.AVA_NOME,
          AVA_ANO: assessment.AVA_ANO,
          AVA_DT_INICIO: assessment.AVA_DT_INICIO,
          AVA_DT_FIM: assessment.AVA_DT_FIM,
          AVA_TIPO: assessment.AVA_TIPO,
        },
        county: {
          MUN_ID: county?.MUN_ID,
          MUN_NOME: county?.MUN_NOME,
          AVM_ID: null,
          AVM_TIPO: typeAssessment,
          AVM_DT_INICIO: null,
          AVM_DT_FIM: null,
          AVM_DT_DISPONIVEL: null,
        },
        tests: assessment.AVA_TES?.map((test) => ({
          TES_ID: test.TES_ID,
          TES_NOME: test.TES_NOME,
          TES_ANO: test.TES_SER,
          subject: test.TES_DIS.DIS_NOME,
        })),
      }
    }

    return {
      assessment: {
        AVA_ID: assessment.AVA_ID,
        AVA_NOME: assessment.AVA_NOME,
        AVA_ANO: assessment.AVA_ANO,
        AVA_DT_INICIO: assessment.AVA_DT_INICIO,
        AVA_DT_FIM: assessment.AVA_DT_FIM,
        AVA_TIPO: assessment.AVA_TIPO,
      },
      county: {
        MUN_ID: countyAssessment?.AVM_MUN.MUN_ID,
        MUN_NOME: countyAssessment?.AVM_MUN.MUN_NOME,
        AVM_ID: countyAssessment?.AVM_ID,
        AVM_TIPO: countyAssessment?.AVM_TIPO,
        AVM_DT_INICIO: countyAssessment.AVM_DT_INICIO,
        AVM_DT_FIM: countyAssessment.AVM_DT_FIM,
        AVM_DT_DISPONIVEL: countyAssessment.AVM_DT_DISPONIVEL,
      },
      tests: assessment.AVA_TES?.map((test) => ({
        TES_ID: test.TES_ID,
        TES_NOME: test.TES_NOME,
        TES_ANO: test.TES_ANO,
        subject: test.TES_DIS?.DIS_NOME,
      })),
    }
  }

  @Transactional()
  async configureCountyPeriod(
    assessmentId: number,
    countyId: number,
    dto: {
      AVM_DT_INICIO: Date
      AVM_DT_FIM: Date
      AVM_DT_DISPONIVEL?: Date
      AVM_TIPO: TypeAssessmentEnum
    },
    user: User,
  ) {
    const assessment = await this.assessmentRepository.findOne({
      where: { AVA_ID: assessmentId },
      relations: ['AVA_AVM', 'AVA_AVM.AVM_MUN'],
    })

    if (!assessment) {
      throw new NotFoundException('Avaliação não encontrada.')
    }

    if (assessment.AVA_TIPO === EditionTypeEnum.ESPECIFICO) {
      const isCountyInAssessment = assessment.AVA_AVM?.some(
        (avm) =>
          avm.AVM_MUN?.MUN_ID === countyId && avm.AVM_TIPO === dto.AVM_TIPO,
      )

      if (!isCountyInAssessment) {
        throw new ForbiddenException(
          'Este município não está autorizado a participar desta avaliação específica.',
        )
      }
    }

    if (assessment.AVA_DT_INICIO && assessment.AVA_DT_FIM) {
      this.validateCountyPeriodWithinEditionPeriod(
        new Date(dto.AVM_DT_INICIO),
        new Date(dto.AVM_DT_FIM),
        new Date(assessment.AVA_DT_INICIO),
        new Date(assessment.AVA_DT_FIM),
      )
    }

    const { assessmentCounty: existingConflict } =
      await this.verifyExistsAssessmentCounty({
        countyId,
        assessmentId,
        dateInitial: dto.AVM_DT_INICIO,
        dateFinal: dto.AVM_DT_FIM,
        type: dto.AVM_TIPO,
      })

    if (existingConflict) {
      throw new ForbiddenException(
        'Já existe uma avaliação nesse período. Por favor, escolha outro intervalo de datas.',
      )
    }

    let assessmentCounty = await this.assessmentCountiesRepository.findOne({
      where: {
        AVM_MUN: { MUN_ID: countyId },
        AVM_AVA: { AVA_ID: assessmentId },
        AVM_TIPO: dto.AVM_TIPO,
      },
    })

    const county = await this.countyRepository.findOne({
      where: { MUN_ID: countyId },
    })

    if (!county) {
      throw new NotFoundException('Município não encontrado.')
    }

    const calculatedAvailabilityDate = subDays(new Date(dto.AVM_DT_INICIO), 7)

    if (assessmentCounty) {
      assessmentCounty.AVM_DT_INICIO = dto.AVM_DT_INICIO
      assessmentCounty.AVM_DT_FIM = dto.AVM_DT_FIM
      assessmentCounty.AVM_DT_DISPONIVEL = calculatedAvailabilityDate
    } else {
      assessmentCounty = this.assessmentCountiesRepository.create({
        AVM_MUN: county,
        AVM_AVA: assessment,
        AVM_DT_INICIO: dto.AVM_DT_INICIO,
        AVM_DT_FIM: dto.AVM_DT_FIM,
        AVM_DT_DISPONIVEL: calculatedAvailabilityDate,
        AVM_TIPO: dto.AVM_TIPO,
        AVM_ATIVO: true,
      })
    }

    try {
      return await this.assessmentCountiesRepository.save(assessmentCounty, {
        data: user,
      })
    } catch (e) {
      throw new InternalServerError()
    }
  }

  private async notifyAllCountiesAboutNewAssessment(): Promise<void> {
    const users = await this.userRepository
      .createQueryBuilder('user')
      .select(['user.USU_ID as USU_ID'])
      .innerJoin('user.USU_SPE', 'USU_SPE')
      .innerJoin('user.USU_MUN', 'USU_MUN', 'USU_MUN.MUN_ATIVO IS TRUE')
      .where('user.USU_ATIVO IS TRUE', { active: true })
      .andWhere(
        '(USU_SPE.role = :municipalRole OR USU_SPE.role = :estadualRole)',
        {
          municipalRole: RoleProfile.MUNICIPIO_MUNICIPAL,
          estadualRole: RoleProfile.MUNICIPIO_ESTADUAL,
        },
      )
      .getRawMany()

    if (users.length > 0) {
      this.mapUserAndCreateNotification(users)
    }
  }

  private async notifySpecificCountiesAboutNewAssessment(
    counties: Array<{
      id: number
      AVM_TIPO: TypeAssessmentEnum
    }>,
  ): Promise<void> {
    for (const county of counties) {
      const profileName =
        county.AVM_TIPO === TypeAssessmentEnum.MUNICIPAL
          ? RoleProfile.MUNICIPIO_MUNICIPAL
          : RoleProfile.MUNICIPIO_ESTADUAL

      const users = await this.userRepository
        .createQueryBuilder('user')
        .select(['user.USU_ID as USU_ID'])
        .innerJoin('user.USU_SPE', 'USU_SPE', 'USU_SPE.role = :role', {
          role: profileName,
        })
        .innerJoin('user.USU_MUN', 'USU_MUN', 'USU_MUN.MUN_ATIVO IS TRUE')
        .where('USU_MUN.MUN_ID = :countyId', { countyId: county.id })
        .andWhere('user.USU_ATIVO IS TRUE')
        .getRawMany()

      if (users.length > 0) {
        this.mapUserAndCreateNotification(users)
      }
    }
  }

  private async mapUserAndCreateNotification(users: User[]) {
    const title = 'Nova Avaliação Disponível'
    const message =
      'Você tem uma nova prova disponível no SAEV. Acesse o módulo de Edições Municipais para ver mais detalhes.'

    const notifications = users.map((user) => {
      return {
        title,
        message,
        user,
      }
    })

    this.notificationsService.createMany(notifications)
  }

  private validateCountyPeriodWithinEditionPeriod(
    countyStart: Date,
    countyEnd: Date,
    editionStart: Date,
    editionEnd: Date,
    countyName?: string,
  ): void {
    const countyNameMsg = countyName ? ` do município ${countyName}` : ''

    if (countyStart < editionStart || countyEnd > editionEnd) {
      throw new BadRequestException(
        `O período${countyNameMsg} deve estar dentro do período da edição (${editionStart.toLocaleDateString('pt-BR')} a ${editionEnd.toLocaleDateString('pt-BR')}).`,
      )
    }

    if (countyStart >= countyEnd) {
      throw new BadRequestException(
        `A data de início deve ser menor que a data de fim${countyNameMsg}.`,
      )
    }
  }

  private getQueryBuilderForPaginateAssessments(
    paginationParams: PaginationParams,
    user: User,
  ) {
    const params = formatParamsByProfile(paginationParams, user)

    const {
      order,
      year,
      search,
      county,
      school,
      schoolClass,
      serie,
      active,
      column,
      stateId,
      typeSchool,
    } = params

    const queryBuilder = this.assessmentRepository
      .createQueryBuilder('Assessments')
      .leftJoin('Assessments.AVA_TES', 'AVA_TES')
      .leftJoin('AVA_TES.TES_DIS', 'TES_DIS')
      .leftJoin('AVA_TES.TES_SER', 'TES_SER')
      .leftJoin('Assessments.AVA_AVM', 'AVA_AVM')
      .leftJoin('AVA_AVM.AVM_MUN', 'MUN')
      .orderBy(`Assessments.${column ?? 'AVA_NOME'}`, order)

    if (search) {
      queryBuilder.andWhere('Assessments.AVA_NOME LIKE :search', {
        search: `%${search}%`,
      })
    }

    if (year) {
      queryBuilder.andWhere('Assessments.AVA_ANO = :year', { year })
    }

    if (school) {
      queryBuilder
        .leftJoin('escola', 'ESCOLA', 'ESCOLA.ESC_MUN_ID = AVA_AVM.AVM_MUN_ID')
        .andWhere('ESCOLA.ESC_ID = :school', { school })
    }

    if (schoolClass) {
      queryBuilder
        .leftJoin('turma', 'TURMA', 'TURMA.TUR_SER_ID = TES_SER.SER_ID')
        .andWhere('TURMA.TUR_ID = :schoolClass', { schoolClass })
    }

    if (county) {
      queryBuilder.andWhere('AVA_AVM.AVM_MUN_ID = :county', { county })
    }

    if (serie) {
      queryBuilder.andWhere('AVA_TES.TES_SER_ID = :serie', { serie })
    }

    if (active) {
      queryBuilder.andWhere('Assessments.AVA_ATIVO = :active', { active })
    }

    if (stateId) {
      queryBuilder.andWhere('MUN.stateId = :stateId', { stateId })
    }

    if (typeSchool) {
      queryBuilder.andWhere('AVA_AVM.AVM_TIPO = :typeSchool', { typeSchool })
    }

    return {
      queryBuilder,
    }
  }
}
