import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { paginateRaw, Pagination } from 'nestjs-typeorm-paginate'
import { PaginationParams } from 'src/helpers/params'
import { Student } from 'src/modules/student/model/entities/student.entity'
import { User } from 'src/modules/user/model/entities/user.entity'
import { formatParamsByProfile } from 'src/utils/format-params-by-profile'
import { Repository } from 'typeorm'

import { CreateSchoolClassDto } from '../model/dto/create-school-class.dto'
import { UpdateSchoolClassDto } from '../model/dto/update-school-class.dto'
import { SchoolClass } from '../model/entities/school-class.entity'
import { SchoolClassStudent } from '../model/entities/school-class-student.entity'

@Injectable()
export class SchoolClassService {
  constructor(
    @InjectRepository(SchoolClass)
    private schoolClassRepository: Repository<SchoolClass>,

    @InjectRepository(Student)
    private studentRepository: Repository<Student>,

    @InjectRepository(SchoolClassStudent)
    private schoolClassStudentRepository: Repository<SchoolClassStudent>,
  ) {}

  findAll(): Promise<SchoolClass[]> {
    return this.schoolClassRepository.find({
      relations: ['TUR_ESC', 'TUR_SER', 'TUR_MUN', 'TUR_PRO'],
      order: { TUR_NOME: 'ASC' },
    })
  }

  findOne(TUR_ID: number): Promise<SchoolClass> {
    return this.schoolClassRepository.findOne(
      { TUR_ID },
      { relations: ['TUR_ESC', 'TUR_SER', 'TUR_MUN', 'TUR_PRO'] },
    )
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
    const queryBuilder = this.schoolClassRepository
      .createQueryBuilder('SchoolClass')
      .leftJoinAndSelect('SchoolClass.TUR_ESC', 'TUR_ESC')
      .leftJoinAndSelect('SchoolClass.TUR_SER', 'TUR_SER')
      .leftJoinAndSelect('SchoolClass.TUR_MUN', 'TUR_MUN')
      .andWhere('TUR_ESC.ESC_ID = :schoolId', { schoolId })
      .orderBy('SchoolClass.TUR_NOME', 'ASC')

    if (active) {
      queryBuilder.andWhere('SchoolClass.TUR_ATIVO = :active', { active })
    }

    if (year) {
      queryBuilder.andWhere('SchoolClass.TUR_ANO = :year', { year })
    }

    if (series) {
      queryBuilder.andWhere('TUR_SER.SER_ID IN(:...series)', {
        series: series?.split(','),
      })
    }

    const data = await queryBuilder.getMany()

    return data
  }

  async paginate(
    params: PaginationParams,
    user: User,
  ): Promise<Pagination<any>> {
    const {
      page,
      limit,
      search,
      column,
      order,
      active,
      year,
      county,
      school,
      stateId,
      typeSchool,
      type,
      status,
      serie,
    } = formatParamsByProfile(params, user, true)
    const queryBuilder = this.schoolClassRepository
      .createQueryBuilder('TURMA')
      .select([
        'TURMA.TUR_ID',
        'TURMA.TUR_NOME',
        'TURMA.TUR_ANO',
        'TURMA.TUR_TIPO',
        'TUR_MUN.MUN_NOME',
        'TUR_ESC.ESC_NOME',
        'TUR_SER.SER_NOME',
        'TURMA.TUR_PERIODO',
        'TURMA.TUR_ATIVO',
      ])
      .leftJoin('TURMA.TUR_SER', 'TUR_SER')
      .leftJoin('TURMA.TUR_ESC', 'TUR_ESC')
      .leftJoin('TURMA.TUR_MUN', 'TUR_MUN')

    switch (column) {
      case 'TURMA_TUR_NOME':
        queryBuilder.orderBy('TURMA.TUR_NOME', order)
        break
      case 'TURMA_TUR_ANO':
        queryBuilder.orderBy('TURMA.TUR_ANO', order)
        break
      case 'TURMA_TUR_TIPO':
        queryBuilder.orderBy('TURMA.TUR_TIPO', order)
        break
      case 'TUR_MUN_MUN_NOME':
        queryBuilder.orderBy('TUR_MUN.MUN_NOME', order)
        break
      case 'TUR_ESC_ESC_NOME':
        queryBuilder.orderBy('TUR_ESC.ESC_NOME', order)
        break
      case 'TUR_SER_SER_NOME':
        queryBuilder.orderBy('TUR_SER.SER_NOME', order)
        break
      case 'TURMA_TUR_ATIVO':
        queryBuilder.orderBy('TURMA.TUR_ATIVO', order)
        break
      case 'TURMA_TUR_ID':
        queryBuilder.orderBy('TURMA.TUR_ID', order)
        break
      case 'TURMA_TUR_PERIODO':
        queryBuilder.orderBy('TURMA.TUR_PERIODO', order)
        break
      default:
        queryBuilder.orderBy('TURMA.TUR_ANO', 'DESC')
        break
    }

    if (year) {
      queryBuilder.andWhere('TURMA.TUR_ANO = :year', { year })
    }

    if (typeSchool) {
      queryBuilder.andWhere('TUR_ESC.ESC_TIPO = :typeSchool', { typeSchool })
    }

    if (school) {
      queryBuilder.andWhere('TUR_ESC.ESC_ID = :school', { school })
    }
    if (county) {
      queryBuilder.andWhere('TUR_MUN.MUN_ID = :county', { county })
    }

    if (stateId) {
      queryBuilder.andWhere('TUR_MUN.stateId = :stateId', { stateId })
    }

    if (type) {
      queryBuilder.andWhere('TURMA.TUR_TIPO = :type', { type })
    }

    if (status) {
      queryBuilder.andWhere('TURMA.TUR_ATIVO = :status', { status })
    }

    if (active !== null) {
      queryBuilder.andWhere('TURMA.TUR_ATIVO = :active', { active })
    }

    if (search) {
      queryBuilder.andWhere('TURMA.TUR_NOME LIKE :q', { q: `%${search}%` })
    }

    if (serie) {
      queryBuilder.andWhere('TUR_SER.SER_ID = :serie', { serie })
    }

    return paginateRaw<SchoolClass>(queryBuilder, {
      page,
      limit,
      route: ' ',
    })
  }

  async paginateTransfer(
    params: PaginationParams,
    user: User,
  ): Promise<Pagination<any>> {
    const { page, limit, column, order, year, county, school, stateId } =
      formatParamsByProfile(params, user, true, true)
    const queryBuilder = this.schoolClassRepository
      .createQueryBuilder('TURMA')
      .select([
        'TURMA.TUR_ID',
        'TURMA.TUR_NOME',
        'TURMA.TUR_ANO',
        'TURMA.TUR_TIPO',
        'TUR_MUN.MUN_NOME',
        'TUR_ESC.ESC_NOME',
        'TUR_SER.SER_NOME',
        'TURMA.TUR_PERIODO',
        'TURMA.TUR_ATIVO',
      ])
      .leftJoin('TURMA.TUR_SER', 'TUR_SER')
      .leftJoin('TURMA.TUR_ESC', 'TUR_ESC')
      .leftJoin('TURMA.TUR_MUN', 'TUR_MUN')
      .andWhere('TURMA.TUR_ATIVO = :active', { active: true })

    switch (column) {
      case 'TURMA_TUR_NOME':
        queryBuilder.orderBy('TURMA.TUR_NOME', order)
        break
      default:
        queryBuilder.orderBy('TURMA.TUR_NOME', 'ASC')
        break
    }

    if (year) {
      queryBuilder.andWhere('TURMA.TUR_ANO = :year', { year })
    }

    if (school) {
      queryBuilder.andWhere('TUR_ESC.ESC_ID = :school', { school })
    }

    if (county) {
      queryBuilder.andWhere('TUR_MUN.MUN_ID = :county', { county })
    }

    if (stateId) {
      queryBuilder.andWhere('TUR_MUN.stateId = :stateId', { stateId })
    }

    return paginateRaw<SchoolClass>(queryBuilder, {
      page,
      limit,
      route: ' ',
    })
  }

  /**
   * Retorna todos as séries da escola
   *
   * @returns retorna uma lista de série
   */
  findSerieBySchool(idSchool: string): Promise<SchoolClass[]> {
    return this.schoolClassRepository
      .createQueryBuilder('TURMA')
      .select(['TUR_SER.SER_ID AS SER_ID, TUR_SER.SER_NOME AS SER_NOME'])
      .leftJoin('TURMA.TUR_SER', 'TUR_SER')
      .leftJoin('TURMA.TUR_ESC', 'TUR_ESC')
      .where(`TUR_ESC.ESC_ID = '${idSchool}'`)
      .andWhere('TUR_SER.SER_ATIVO = 1')
      .groupBy('TURMA.TUR_SER')
      .execute()
  }

  /**
   * Criar turma
   *
   * @param createSchoolClassDto objeto referente a criação de turma
   * @returns informa que o turma foi criada
   */
  async add(createSchoolClassDto: CreateSchoolClassDto, user: User) {
    const { schoolClass } =
      await this.verifyExistsSchoolClass(createSchoolClassDto)

    if (schoolClass) {
      throw new ForbiddenException('Turma já cadastrada.')
    }

    return this.schoolClassExists(createSchoolClassDto).then(
      (exists: boolean) => {
        if (!exists) {
          return this.schoolClassRepository
            .save(createSchoolClassDto, { data: user })
            .then((createSchoolClass: SchoolClass) => {
              return createSchoolClass
            })
        } else {
          throw new HttpException('Turma já cadastrada.', HttpStatus.CONFLICT)
        }
      },
    )
  }

  async verifyExistsSchoolClass(
    dto: UpdateSchoolClassDto,
  ): Promise<{ schoolClass: SchoolClass | null }> {
    const { TUR_ANO, TUR_NOME, TUR_PERIODO, TUR_ESC } = dto

    const schoolClass = await this.schoolClassRepository.findOne({
      where: {
        TUR_ANO,
        TUR_NOME,
        TUR_PERIODO,
        TUR_ESC: {
          ESC_ID: TUR_ESC,
        },
      },
    })

    return {
      schoolClass,
    }
  }

  async createSchoolClassStudent(student: Student, schoolClass: SchoolClass) {
    const date = new Date()
    const findSchoolClassStudent = await this.schoolClassStudentRepository
      .createQueryBuilder('class')
      .leftJoinAndSelect('class.student', 'student')
      .leftJoinAndSelect('class.schoolClass', 'schoolClass')
      .where('student.ALU_ID = :id', { id: student.ALU_ID })
      .orderBy('class.createdAt', 'DESC')
      .getOne()

    if (findSchoolClassStudent?.schoolClass?.TUR_ID === schoolClass?.TUR_ID) {
      return
    }

    if (findSchoolClassStudent && !findSchoolClassStudent?.endDate) {
      findSchoolClassStudent.endDate = date

      await this.schoolClassStudentRepository.save(findSchoolClassStudent)
    }

    const schoolClassStudent = this.schoolClassStudentRepository.create({
      student,
      schoolClass,
      startDate: date,
    })

    await this.schoolClassStudentRepository.save(schoolClassStudent)
  }

  async createSchoolClassStudentEndDate(
    student: Student,
    schoolClass: SchoolClass,
  ) {
    const date = new Date()
    const findSchoolClassStudent = await this.schoolClassStudentRepository
      .createQueryBuilder('class')
      .leftJoinAndSelect('class.student', 'student')
      .leftJoin('class.schoolClass', 'schoolClass')
      .where('student.ALU_ID = :id', { id: student.ALU_ID })
      .andWhere('schoolClass.TUR_ID = :turId', { turId: schoolClass.TUR_ID })
      .orderBy('class.createdAt', 'DESC')
      .getOne()

    if (findSchoolClassStudent) {
      findSchoolClassStudent.endDate = date
      findSchoolClassStudent.startDate =
        findSchoolClassStudent.startDate ?? date

      return await this.schoolClassStudentRepository.save(
        findSchoolClassStudent,
      )
    }

    const schoolClassStudent = this.schoolClassStudentRepository.create({
      student,
      schoolClass,
      startDate: date,
      endDate: date,
    })

    await this.schoolClassStudentRepository.save(schoolClassStudent)
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
    const { schoolClass } =
      await this.verifyExistsSchoolClass(updateSchoolClassDto)

    if (schoolClass?.TUR_ID && schoolClass?.TUR_ID !== TUR_ID) {
      throw new ForbiddenException('Turma já cadastrada.')
    }

    const school = this.schoolClassRepository
      .save({ ...updateSchoolClassDto, TUR_ID }, { data: user })
      .then((updateSchoolClass: SchoolClass) => {
        return updateSchoolClass
      })

    if (
      !updateSchoolClassDto.TUR_ATIVO !== undefined &&
      !updateSchoolClassDto.TUR_ATIVO
    ) {
      this.uncrowdStudentsBySchool(TUR_ID)
    }

    return school
  }

  async uncrowdStudentsBySchool(idSchoolClass: number): Promise<void> {
    const students = await this.studentRepository.find({
      where: {
        ALU_TUR: {
          TUR_ID: idSchoolClass,
        },
      },
    })

    for (const student of students) {
      const schoolClass = {
        TUR_ID: idSchoolClass,
      } as any

      await this.createSchoolClassStudentEndDate(student, schoolClass)
      await this.studentRepository.save({
        ...student,
        ALU_TUR: null,
        ALU_SER: null,
        ALU_STATUS: 'Não Enturmado',
      })
    }
  }

  /**
   * Verificação se já existe o mesmo avaliação, com mesmo estado e cidade
   * @returns retorna o resultado da consulta como VERDADEIRO ou FALSO
   */
  async schoolClassExists(
    createSchoolClassDto: CreateSchoolClassDto,
  ): Promise<boolean> {
    const assessment = await this.schoolClassRepository.findOne({
      TUR_ANO: createSchoolClassDto.TUR_ANO,
      TUR_MUN: createSchoolClassDto.TUR_MUN,
      TUR_ESC: createSchoolClassDto.TUR_ESC,
      TUR_SER: createSchoolClassDto.TUR_SER,
      TUR_PERIODO: createSchoolClassDto.TUR_PERIODO,
      TUR_TIPO: createSchoolClassDto.TUR_TIPO,
      TUR_NOME: createSchoolClassDto.TUR_NOME,
    })
    return !!assessment
  }
}
