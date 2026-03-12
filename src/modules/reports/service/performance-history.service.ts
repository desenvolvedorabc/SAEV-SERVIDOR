import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectConnection, InjectRepository } from '@nestjs/typeorm'
import { Parser } from 'json2csv'
import { PaginationParams } from 'src/helpers/params'
import { Assessment } from 'src/modules/assessment/model/entities/assessment.entity'
import { School } from 'src/modules/school/model/entities/school.entity'
import { SubjectTypeEnum } from 'src/modules/subject/model/enum/subject-type.enum'
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

    const {
      school,
      schoolClass,
      county,
      municipalityOrUniqueRegionalId,
      type,
    } = params

    if (schoolClass) {
      return await this.getStudentsBySchoolClass(params)
    }

    if (school) {
      if (type === 'general') {
        return await this.getSchoolClassesBySchool(params)
      }
      return await this.getStudentsBySchool(params)
    }

    if (municipalityOrUniqueRegionalId) {
      return await this.getSchoolsByRegional(params)
    }

    if (county) {
      return await this.getRegionalsByCounty(params)
    }
  }

  private calculateAggregatedPerformance(
    testReports: any[],
    subjectType: SubjectTypeEnum,
    serieNumber: number,
  ): number {
    if (subjectType === SubjectTypeEnum.OBJETIVA) {
      const totalGrades = testReports.reduce(
        (sum: number, rs: any) => sum + Number(rs.totalGradesStudents || 0),
        0,
      )
      const totalPresent = testReports.reduce(
        (sum: number, rs: any) => sum + Number(rs.countPresentStudents || 0),
        0,
      )

      return totalPresent > 0 ? Math.round(totalGrades / totalPresent) : 0
    } else {
      const totalStudents = testReports.reduce(
        (sum: number, rs: any) => sum + Number(rs.countTotalStudents || 0),
        0,
      )

      let rightQuestions = 0

      switch (serieNumber) {
        case 1:
          rightQuestions = testReports.reduce(
            (sum: number, rs: any) =>
              sum +
              Number(rs.fluente || 0) +
              Number(rs.nao_fluente || 0) +
              Number(rs.frases || 0),
            0,
          )
          break
        case 2:
        case 3:
          rightQuestions = testReports.reduce(
            (sum: number, rs: any) =>
              sum + Number(rs.fluente || 0) + Number(rs.nao_fluente || 0),
            0,
          )
          break
        default:
          rightQuestions = testReports.reduce(
            (sum: number, rs: any) => sum + Number(rs.fluente || 0),
            0,
          )
          break
      }

      const totalRightQuestions =
        totalStudents > 0
          ? Math.round((rightQuestions / totalStudents) * 100)
          : 0

      return totalRightQuestions
    }
  }

  private async getRegionalsByCounty(params: PaginationParams) {
    const { reports } =
      await this.performanceHistoryRepository.getDataReports(params)

    const { exams } =
      await this.performanceHistoryRepository.getExamsBySerieAndYear(params)

    const serieNumber =
      reports.length > 0 && reports[0].reportsSubjects.length > 0
        ? reports[0].reportsSubjects[0].test?.TES_SER?.SER_NUMBER
        : 1

    const regionalsMap = new Map()

    reports.forEach((report) => {
      const regionalId = report.regional?.id
      const regionalName = report.regional?.name

      if (!regionalId) return

      if (!regionalsMap.has(regionalId)) {
        regionalsMap.set(regionalId, {
          id: regionalId,
          name: regionalName,
        })
      }
    })

    // Agrupa por edição
    const editionsMap = new Map()

    reports.forEach((report) => {
      const editionId = report.edition?.AVA_ID
      const editionName = report.edition?.AVA_NOME

      if (!editionsMap.has(editionId)) {
        editionsMap.set(editionId, {
          id: editionId,
          name: editionName,
          tests: [],
        })
      }
    })

    const items = []
    for (const [editionId, edition] of editionsMap.entries()) {
      const tests = []

      for (const exam of exams) {
        const data = []

        for (const [regionalId, regionalData] of regionalsMap.entries()) {
          const regionalReports = reports
            .filter(
              (r) =>
                r.regional?.id === regionalId &&
                r.edition?.AVA_ID === editionId,
            )
            .map((r) =>
              r.reportsSubjects.find((rs) => rs.test.TES_ID === exam.TES_ID),
            )
            .filter(Boolean)

          if (regionalReports.length === 0) continue

          // Calcula média agregada baseada no tipo de teste
          const avg = this.calculateAggregatedPerformance(
            regionalReports,
            exam.TES_DIS.DIS_TIPO,
            serieNumber,
          )

          data.push({
            id: regionalData.id,
            name: regionalData.name,
            avg,
          })
        }

        if (data.length > 0) {
          tests.push({
            id: exam.TES_ID,
            subject: exam.TES_DIS.DIS_NOME,
            dis_tipo: exam.TES_DIS.DIS_TIPO,
            data,
          })
        }
      }

      if (tests.length > 0) {
        items.push({
          id: edition.id,
          name: edition.name,
          tests,
        })
      }
    }

    return { items }
  }

  private async getSchoolsByRegional(params: PaginationParams) {
    const { reports } =
      await this.performanceHistoryRepository.getDataReports(params)

    const { exams } =
      await this.performanceHistoryRepository.getExamsBySerieAndYear(params)

    const serieNumber =
      reports.length > 0 && reports[0].reportsSubjects.length > 0
        ? reports[0].reportsSubjects[0].test?.TES_SER?.SER_NUMBER
        : 1

    const schoolsMap = new Map()

    reports.forEach((report) => {
      const schoolId = report.school?.ESC_ID
      const schoolName = report.school?.ESC_NOME

      if (!schoolId) return

      if (!schoolsMap.has(schoolId)) {
        schoolsMap.set(schoolId, {
          id: schoolId,
          name: schoolName,
        })
      }
    })

    const editionsMap = new Map()

    reports.forEach((report) => {
      const editionId = report.edition?.AVA_ID
      const editionName = report.edition?.AVA_NOME

      if (!editionsMap.has(editionId)) {
        editionsMap.set(editionId, {
          id: editionId,
          name: editionName,
          tests: [],
        })
      }
    })

    const items = []
    for (const [editionId, edition] of editionsMap.entries()) {
      const tests = []

      for (const exam of exams) {
        const data = []

        for (const [schoolId, schoolData] of schoolsMap.entries()) {
          const schoolReports = reports
            .filter(
              (r) =>
                r.school?.ESC_ID === schoolId &&
                r.edition?.AVA_ID === editionId,
            )
            .map((r) =>
              r.reportsSubjects.find((rs) => rs.test.TES_ID === exam.TES_ID),
            )
            .filter(Boolean)

          if (schoolReports.length === 0) continue

          const avg = this.calculateAggregatedPerformance(
            schoolReports,
            exam.TES_DIS.DIS_TIPO,
            serieNumber,
          )

          data.push({
            id: schoolData.id,
            name: schoolData.name,
            avg,
          })
        }

        if (data.length > 0) {
          tests.push({
            id: exam.TES_ID,
            subject: exam.TES_DIS.DIS_NOME,
            dis_tipo: exam.TES_DIS.DIS_TIPO,
            data,
          })
        }
      }

      if (tests.length > 0) {
        items.push({
          id: edition.id,
          name: edition.name,
          tests,
        })
      }
    }

    return { items }
  }

  private async getSchoolClassesBySchool(params: PaginationParams) {
    const { reports } =
      await this.performanceHistoryRepository.getDataReports(params)

    const { exams } =
      await this.performanceHistoryRepository.getExamsBySerieAndYear(params)

    const serieNumber =
      reports.length > 0 && reports[0].reportsSubjects.length > 0
        ? reports[0].reportsSubjects[0].test?.TES_SER?.SER_NUMBER
        : 1

    const schoolClassesMap = new Map()

    reports.forEach((report) => {
      const schoolClassId = report.schoolClass?.TUR_ID
      const schoolClassName = report.schoolClass?.TUR_NOME

      if (!schoolClassId) return

      if (!schoolClassesMap.has(schoolClassId)) {
        schoolClassesMap.set(schoolClassId, {
          id: schoolClassId,
          name: schoolClassName,
        })
      }
    })

    const editionsMap = new Map()

    reports.forEach((report) => {
      const editionId = report.edition?.AVA_ID
      const editionName = report.edition?.AVA_NOME

      if (!editionsMap.has(editionId)) {
        editionsMap.set(editionId, {
          id: editionId,
          name: editionName,
          tests: [],
        })
      }
    })

    const items = []
    for (const [editionId, edition] of editionsMap.entries()) {
      const tests = []

      for (const exam of exams) {
        const data = []

        for (const [
          schoolClassId,
          schoolClassData,
        ] of schoolClassesMap.entries()) {
          const schoolClassReports = reports
            .filter(
              (r) =>
                r.schoolClass?.TUR_ID === schoolClassId &&
                r.edition?.AVA_ID === editionId,
            )
            .map((r) =>
              r.reportsSubjects.find((rs) => rs.test.TES_ID === exam.TES_ID),
            )
            .filter(Boolean)

          if (schoolClassReports.length === 0) continue

          const avg = this.calculateAggregatedPerformance(
            schoolClassReports,
            exam.TES_DIS.DIS_TIPO,
            serieNumber,
          )

          data.push({
            id: schoolClassData.id,
            name: schoolClassData.name,
            avg,
          })
        }

        if (data.length > 0) {
          tests.push({
            id: exam.TES_ID,
            subject: exam.TES_DIS.DIS_NOME,
            dis_tipo: exam.TES_DIS.DIS_TIPO,
            data,
          })
        }
      }

      if (tests.length > 0) {
        items.push({
          id: edition.id,
          name: edition.name,
          tests,
        })
      }
    }

    return { items }
  }

  private async getStudentsBySchool(params: PaginationParams) {
    const data = await this.performanceHistoryRepository.getStudents(params)

    if (data?.items?.length === 0) {
      return data
    }

    const students = data.items
    const { school: findSchool } = await this.getSchool(params.school)

    const assessmentQueryBuilder = this.assessmentRepository
      .createQueryBuilder('Assessments')
      .innerJoinAndSelect(
        'Assessments.AVA_TES',
        'AVA_TES',
        'AVA_TES.TES_SER_ID = :serie',
        { serie: params.serie },
      )
      .leftJoinAndSelect('AVA_TES.TEMPLATE_TEST', 'TEMPLATE_TEST')
      .leftJoinAndSelect('AVA_TES.TES_DIS', 'TES_DIS')
      .leftJoin('AVA_TES.TES_SER', 'TES_SER', 'AVA_TES.TES_SER_ID = :serie', {
        serie: params.serie,
      })
      .innerJoin('Assessments.AVA_AVM', 'AVA_AVM')
      .innerJoin('AVA_AVM.AVM_MUN', 'county', 'county.MUN_ID = :countyId', {
        countyId: params.county,
      })
      .andWhere('Assessments.AVA_ANO = :year', { year: params.year })
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
                    data: STUDENTS_TEST,
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
                    data: STUDENTS_TEST,
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

  private async getStudentsBySchoolClass(params: PaginationParams) {
    return await this.getStudentsBySchool(params)
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

    const { items } = await this.handle(
      { ...paginationParams, isCsv: true },
      user,
    )

    const {
      county,
      municipalityOrUniqueRegionalId,
      school,
      schoolClass,
      type,
    } = params

    let entityLabel = ''
    let typeKey = type

    if (schoolClass || (school && type === 'student')) {
      entityLabel = 'Aluno'
      typeKey = 'student'
    } else if (school && type === 'general') {
      entityLabel = 'Turma'
      typeKey = ''
    } else if (municipalityOrUniqueRegionalId) {
      entityLabel = 'Escola'
      typeKey = ''
    } else if (county) {
      entityLabel = 'Regional'
      typeKey = ''
    } else {
      throw new BadRequestException('Parâmetros insuficientes para gerar CSV.')
    }

    const csvData = this.buildCsvData(items, typeKey, entityLabel)

    const parser = new Parser({
      delimiter: ';',
      quote: ' ',
      withBOM: true,
    })

    try {
      const csv = parser.parse(csvData)
      return csv
    } catch (error) {
      console.log('error csv:', error.message)
      throw new BadRequestException('Erro ao gerar CSV.')
    }
  }

  private buildCsvData(items: any[], type: string, entityLabel: string): any[] {
    const csvData = []

    for (const item of items) {
      for (const test of item.tests) {
        for (const entity of test.data) {
          console.log(entity)
          const row: any = {
            Avaliacao: item.name,
            Disciplina: test.subject,
            Tipo: test.dis_tipo,
          }

          row[entityLabel] = entity.name

          if (type === 'student') {
            if (test.dis_tipo === SubjectTypeEnum.OBJETIVA) {
              row.Desempenho = isNaN(entity.avg)
                ? 'Não Informado'
                : entity.avg + '%'
            } else {
              row.Desempenho = LevelsText[entity.type] || 'Não Informado'
            }
          } else {
            row.Desempenho = entity.avg + '%'
          }

          csvData.push(row)
        }
      }
    }

    return csvData
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
