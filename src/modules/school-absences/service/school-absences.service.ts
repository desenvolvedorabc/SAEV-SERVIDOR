import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import {
  IPaginationOptions,
  paginateRaw,
  Pagination,
} from 'nestjs-typeorm-paginate'
import { Student } from 'src/modules/student/model/entities/student.entity'
import { User } from 'src/modules/user/model/entities/user.entity'
import { Repository } from 'typeorm'

import { CreateSchoolAbsencesDto } from '../model/dto/create-school-absences.dto'
import { SchoolAbsence } from '../model/entities/school-absences.entity'

@Injectable()
export class SchoolAbsencesService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(SchoolAbsence)
    private schoolAbsencesRepository: Repository<SchoolAbsence>,
  ) {}

  /**
   * Salvar uma lista de infrequências
   * @param createSchoolAbsencesDto
   */
  async save(createSchoolAbsencesDto: CreateSchoolAbsencesDto[], user: User) {
    const listSchoolAbsencesDto = JSON.parse(
      JSON.stringify(createSchoolAbsencesDto[0]),
    )
    await Promise.all(
      listSchoolAbsencesDto.map(
        async (schoolAbsencesDto: CreateSchoolAbsencesDto) => {
          // const idStudent = JSON.parse(
          //   JSON.stringify(schoolAbsencesDto.IFR_ALU_ID),
          // )

          const idStudent = JSON.parse(
            JSON.stringify(schoolAbsencesDto.IFR_ALU_ID),
          )
          const month = JSON.parse(JSON.stringify(schoolAbsencesDto.IFR_MES))
          const schoolAbsencesExisting = await this.findSchoolAbsencesExisting(
            idStudent,
            +month.MES_ID,
            +schoolAbsencesDto.IFR_ANO,
          )
          const studentExisting =
            await this.studentRepository.findOne(idStudent)
          schoolAbsencesDto.IFR_ALU = studentExisting
          schoolAbsencesDto.IFR_MES = month.MES_ID

          if (schoolAbsencesExisting) {
            const { IFR_ID } = schoolAbsencesExisting

            return this.schoolAbsencesRepository
              .save({ ...schoolAbsencesDto, IFR_ID }, { data: user })
              .then(() => {
                return schoolAbsencesDto
              })
          }
          this.schoolAbsencesRepository
            .save(schoolAbsencesDto, { data: user })
            .then(() => {
              return schoolAbsencesDto
            })
        },
      ),
    )
  }

  async findSchoolAbsencesExisting(
    idStudent: string,
    month: number,
    year: number,
  ) {
    return this.schoolAbsencesRepository
      .createQueryBuilder('INFREQUENCIA')
      .select(['INFREQUENCIA.IFR_ID'])
      .where(
        'INFREQUENCIA.IFR_ALU_ID = :idStudent AND INFREQUENCIA.IFR_MES = :month AND INFREQUENCIA.IFR_ANO = :year',
        { idStudent, month, year },
      )
      .getOne()
  }

  /**
   * Salvar uma lista de infrequências
   * @param createSchoolAbsencesDto
   */
  async delete(createSchoolAbsencesDto: CreateSchoolAbsencesDto[]) {
    await Promise.all(
      createSchoolAbsencesDto.map(
        async (schoolAbsencesDto: CreateSchoolAbsencesDto) => {
          // const idStudent = JSON.parse(
          //   JSON.stringify(schoolAbsencesDto.IFR_ALU_ID),
          // )

          const idStudent = JSON.parse(
            JSON.stringify(schoolAbsencesDto.IFR_ALU),
          )
          this.deleteSchoolAbsences(
            idStudent,
            +schoolAbsencesDto.IFR_MES,
            +schoolAbsencesDto.IFR_ANO,
          )
        },
      ),
    )
  }

  deleteSchoolAbsences(idStudent: string, month: number, year: number) {
    return this.schoolAbsencesRepository
      .createQueryBuilder('INFREQUENCIA')
      .where(
        'INFREQUENCIA.IFR_ALU_ID = :idStudent AND INFREQUENCIA.IFR_MES = :month AND INFREQUENCIA.IFR_ANO = :year',
        { idStudent, month, year },
      )
      .delete()
      .execute()
  }

  /**
   * Listagem de infrequências com paginação, ordenação e pesquisa por nome.
   *
   * @param options adicionar o limite e qual página estamos
   * @param search permitir pesquisa por um termo pelo nome do infrequência
   * @param column coluna usada na ordenação
   * @param orderBY cria a ordenação para a listagem
   * @param schoolClassId busca somente a turma
   * @param month busca somente o mês
   * @param year busca somente o ano
   * @returns Retorna a lista paginada, ordenada e filtrada com os infrequências
   */
  async paginate(
    options: IPaginationOptions,
    search: string,
    column: string,
    orderBy: string,
    schoolClassId: number,
    month: number,
    year: string,
  ): Promise<Pagination<any>> {
    const queryBuilder = this.studentRepository
      .createQueryBuilder('ALUNO')
      .select([
        'ALUNO.ALU_ID AS ALU_ID',
        'ALUNO.ALU_NOME AS ALU_NOME',
        'ALUNO.ALU_INEP AS ALU_INEP',
        'INFREQUENCIA.IFR_MES',
        'INFREQUENCIA.IFR_ANO',
        'INFREQUENCIA.IFR_FALTA',
      ])
      .leftJoin(
        'infrequencia',
        'INFREQUENCIA',
        'INFREQUENCIA.IFR_ALU_ID = ALUNO.ALU_ID AND INFREQUENCIA.IFR_MES = :month AND INFREQUENCIA.IFR_ANO = :year',
        { month, year },
      )

    const order: any = orderBy

    switch (column) {
      case 'ALU_INEP':
        queryBuilder.orderBy('ALU_INEP', order)
        break
      case 'ALU_ID':
        queryBuilder.orderBy('ALU_ID', order)
        break
      default:
        queryBuilder.orderBy('ALU_NOME', order)
        break
    }

    queryBuilder.andWhere('ALUNO.ALU_TUR_ID = :schoolClass', {
      schoolClass: schoolClassId,
    })

    if (search) {
      search = search.replace('°', 'º')
      queryBuilder.andWhere(
        '(ALU_NOME LIKE :search OR ALU_INEP LIKE :search OR ALU_ID LIKE :search)',
        { search: `%${search}%` },
      )
    }

    return paginateRaw<Student>(queryBuilder, options)
  }
}
