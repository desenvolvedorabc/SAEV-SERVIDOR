import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectConnection, InjectRepository } from '@nestjs/typeorm'
import { Parser } from 'json2csv'
import { PaginationParams } from 'src/helpers/params'
import { Assessment } from 'src/modules/assessment/model/entities/assessment.entity'
import { School } from 'src/modules/school/model/entities/school.entity'
import { User } from 'src/modules/user/model/entities/user.entity'
import { formatParamsByProfile } from 'src/utils/format-params-by-profile'
import { Connection, Repository } from 'typeorm'

import { PerformanceHistoryRepository } from '../repositories/performance-history.repository'

@Injectable()
export class PerformanceHistoryService {
  constructor(
    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,

    private readonly performanceHistoryRepository: PerformanceHistoryRepository,

    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async handle(paginationParams: PaginationParams, user: User) {
    const params = formatParamsByProfile(paginationParams, user)

    const { serie, school, year, county } = params

    if (!school) {
      throw new BadRequestException('Informe uma escola.')
    }

    const data = await this.performanceHistoryRepository.getStudents(params)

    if (data?.items?.length === 0) {
      return data
    }

    const students = data.items

    const { school: findSchool } = await this.getSchool(school)

    const assessmentQueryBuilder = this.assessmentRepository
      .createQueryBuilder('Assessments')
      .innerJoinAndSelect(
        'Assessments.AVA_TES',
        'AVA_TES',
        'AVA_TES.TES_SER_ID = :serie',
        { serie },
      )
      .leftJoinAndSelect('AVA_TES.TEMPLATE_TEST', 'TEMPLATE_TEST')
      .leftJoinAndSelect('AVA_TES.TES_DIS', 'TES_DIS')
      .leftJoin('AVA_TES.TES_SER', 'TES_SER', 'AVA_TES.TES_SER_ID = :serie', {
        serie,
      })
      .innerJoin('Assessments.AVA_AVM', 'AVA_AVM')
      .innerJoin('AVA_AVM.AVM_MUN', 'county', 'county.MUN_ID = :countyId', {
        countyId: county,
      })
      .andWhere('Assessments.AVA_ANO = :year', { year })
      .andWhere('AVA_AVM.AVM_TIPO = :typeSchool', {
        typeSchool: findSchool?.ESC_TIPO,
      })

    const assessments = await assessmentQueryBuilder.getMany()

    let items = []
    if (assessments.length) {
      items = await Promise.all(
        assessments.map(async (assessment) => {
          let tests = []
          if (assessment?.AVA_TES?.length) {
            tests = await Promise.all(
              assessment?.AVA_TES?.map(async (test) => {
                if (test.TES_DIS.DIS_TIPO === 'Objetiva') {
                  const STUDENTS_TEST = await Promise.all(
                    students?.map(async (student) => {
                      const { studentTest } =
                        await this.performanceHistoryRepository.getInfoStudent(
                          student.ALU_ID,
                          test?.TES_ID,
                        )

                      const ANSWERS_TEST = studentTest?.ANSWERS_TEST?.filter(
                        (arr, index, self) =>
                          index ===
                          self.findIndex(
                            (t) =>
                              t?.questionTemplate?.TEG_ID ===
                              arr?.questionTemplate?.TEG_ID,
                          ),
                      )

                      const STUDENTS_RIGHT = ANSWERS_TEST?.reduce(
                        (sum, cur) => {
                          if (cur?.ATR_CERTO) {
                            return sum + 1
                          } else {
                            return sum
                          }
                        },
                        0,
                      )

                      return {
                        id: student.ALU_ID,
                        name: student.ALU_NOME,
                        avg: +Math.round(
                          (STUDENTS_RIGHT / test?.TEMPLATE_TEST?.length) * 100,
                        ),
                      }
                    }),
                  )

                  return {
                    id: test.TES_ID,
                    subject: test.TES_DIS.DIS_NOME,
                    dis_tipo: test.TES_DIS.DIS_TIPO,
                    students: STUDENTS_TEST,
                  }
                } else {
                  const STUDENTS_TEST = await Promise.all(
                    students?.map(async (student) => {
                      const { studentTest } =
                        await this.performanceHistoryRepository.getInfoStudent(
                          +student.ALU_ID,
                          test?.TES_ID,
                        )

                      let type: string = 'nao_informado'

                      if (studentTest) {
                        type =
                          !studentTest?.ALT_FINALIZADO ||
                          !studentTest?.ANSWERS_TEST?.length
                            ? 'nao_avaliado'
                            : studentTest.ANSWERS_TEST[0].ATR_RESPOSTA
                      }

                      return {
                        id: student.ALU_ID,
                        name: student.ALU_NOME,
                        type,
                      }
                    }),
                  )

                  return {
                    id: test.TES_ID,
                    subject: test.TES_DIS.DIS_NOME,
                    dis_tipo: test.TES_DIS.DIS_TIPO,
                    students: STUDENTS_TEST,
                  }
                }
              }),
            )
          }

          return {
            id: assessment.AVA_ID,
            name: assessment.AVA_NOME,
            tests,
          }
        }),
      )
    }

    return { ...data, items }
  }

  async getSchool(schoolId: number) {
    const school = await this.connection.getRepository(School).findOne({
      where: {
        ESC_ID: schoolId,
      },
    })

    return {
      school,
    }
  }

  async generateCsv(paginationParams: PaginationParams, user: User) {
    const params = formatParamsByProfile(paginationParams, user)

    const { items: students } =
      await this.performanceHistoryRepository.getStudents({
        ...params,
        isCsv: true,
      })

    const { items } = await this.handle(
      { ...paginationParams, isCsv: true },
      user,
    )

    const { school } = await this.getSchool(params?.school)

    const csvData = students.map((student) => {
      const aux: any = {}

      aux.Alunos = student.ALU_NOME
      for (const item of items) {
        item.tests.forEach((test) => {
          const studentTest = test.students.find((x) => x.id === student.ALU_ID)

          if (test.dis_tipo === 'Objetiva') {
            aux[`[${test.subject}] ${item.name}`] = isNaN(studentTest.avg)
              ? 'Não Informado'
              : studentTest.avg + '%'
          } else {
            aux[`[${test.subject}] ${item.name}`] = LevelsText[studentTest.type]
          }
        })
      }

      return { escola: school?.ESC_NOME ?? 'N/A', ...aux }
    })

    const parser = new Parser({
      quote: ' ',
      withBOM: true,
    })

    try {
      const csv = parser.parse(csvData)
      return csv
    } catch (error) {
      console.log('error csv:', error.message)
    }
  }
}

enum LevelsText {
  fluente = 'Fluente',
  nao_fluente = 'Não Fluente',
  frases = 'Frases',
  palavras = 'Palavras',
  silabas = 'Sílabas',
  nao_leitor = 'Não Leitor',
  nao_avaliado = 'Não Avaliado',
  nao_informado = 'Não Informado',
}
