import { Injectable } from '@nestjs/common'
import { InjectConnection, InjectRepository } from '@nestjs/typeorm'
import { Parser } from 'json2csv'
import { PaginationParams } from 'src/helpers/params'
import { Assessment } from 'src/modules/assessment/model/entities/assessment.entity'
import { County } from 'src/modules/counties/model/entities/county.entity'
import { School } from 'src/modules/school/model/entities/school.entity'
import { TypeSchoolEnum } from 'src/modules/school/model/enum/type-school.enum'
import { Serie } from 'src/modules/serie/model/entities/serie.entity'
import { User } from 'src/modules/user/model/entities/user.entity'
import { formatParamsByProfile } from 'src/utils/format-params-by-profile'
import { Connection, Repository } from 'typeorm'

import { ReportEdition } from '../model/entities/report-edition.entity'
import { GeneralSynthesisRepository } from '../repositories/general-synthesis.repository'

const leitorBySerie = {
  1: ['frases', 'nao_fluente', 'fluente'],
  2: ['nao_fluente', 'fluente'],
  3: ['nao_fluente', 'fluente'],
  4: ['fluente'],
  5: ['fluente'],
  6: ['fluente'],
  7: ['fluente'],
  8: ['fluente'],
  9: ['fluente'],
} as const

@Injectable()
export class GeneralSynthesisService {
  constructor(
    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,

    @InjectConnection()
    private readonly connection: Connection,

    private readonly generalSynthesisRepository: GeneralSynthesisRepository,
  ) {}

  async getReportSchoolClass({
    edition,
    serie,
    schoolClass,
    typeSchool,
    verifyProfileForState,
  }: PaginationParams) {
    const detailsSerie = await this.connection.getRepository(Serie).findOne({
      where: {
        SER_ID: serie,
      },
    })

    const queryBuilderSubject = await this.connection
      .getRepository(ReportEdition)
      .createQueryBuilder('ReportEdition')
      .addSelect(['ReportEdition.id'])
      .innerJoin('ReportEdition.schoolClass', 'schoolClass')
      .innerJoin('schoolClass.TUR_MUN', 'county')
      .innerJoinAndSelect('ReportEdition.reportsSubjects', 'reportsSubjects')
      .where('ReportEdition.schoolClass = :schoolClass', { schoolClass })
      .andWhere('ReportEdition.edition = :edition', { edition })

    if (!typeSchool && verifyProfileForState) {
      queryBuilderSubject.andWhere(
        `((ReportEdition.type = '${TypeSchoolEnum.ESTADUAL}') or (ReportEdition.type = '${TypeSchoolEnum.MUNICIPAL}' && county.MUN_COMPARTILHAR_DADOS IS TRUE))`,
      )
    }

    if (verifyProfileForState && typeSchool === TypeSchoolEnum.MUNICIPAL) {
      queryBuilderSubject.andWhere('county.MUN_COMPARTILHAR_DADOS IS TRUE')
    }

    const reportEdition = await queryBuilderSubject.getOne()

    const idsStudents = reportEdition?.reportsSubjects[0]?.idStudents

    if (!reportEdition) {
      return {
        items: [],
      }
    }

    const queryBuilder = this.assessmentRepository
      .createQueryBuilder('Assessment')
      .leftJoinAndSelect('Assessment.AVA_TES', 'AVA_TES')
      .innerJoin('AVA_TES.TES_SER', 'TES_SER', `TES_SER.SER_ID IN (:series)`, {
        series: serie?.split(','),
      })
      .leftJoinAndSelect('AVA_TES.TEMPLATE_TEST', 'TEMPLATE_TEST')
      .leftJoinAndSelect('TEMPLATE_TEST.TEG_MTI', 'TEG_MTI')
      .leftJoinAndSelect('AVA_TES.TES_DIS', 'TES_DIS')
      .andWhere('Assessment.AVA_ID = :AVA_ID', {
        AVA_ID: edition,
      })

    const ava = await queryBuilder.getOne()

    let items = []

    if (!!ava?.AVA_TES?.length && idsStudents?.length) {
      items = await Promise.all(
        ava?.AVA_TES?.map(async (test) => {
          if (test.TES_DIS.DIS_TIPO === 'Objetiva') {
            const STUDENTS_TEST = await Promise.all(
              idsStudents?.map(async (ALU_ID) => {
                const { student, studentTest } =
                  await this.generalSynthesisRepository.getInfoStudent(
                    +ALU_ID,
                    test?.TES_ID,
                    schoolClass,
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

                const STUDENTS_RIGHT = ANSWERS_TEST?.reduce((sum, cur) => {
                  if (cur?.ATR_CERTO) {
                    return sum + 1
                  } else {
                    return sum
                  }
                }, 0)

                const quests = ANSWERS_TEST?.map((data) => {
                  return {
                    id: data.ATR_ID,
                    letter: data.ATR_RESPOSTA,
                    type: data?.ATR_CERTO ? 'right' : 'wrong',
                    questionId: data?.questionTemplate?.TEG_ID,
                  }
                })

                return {
                  id: student.ALU_ID,
                  name: student.ALU_NOME,
                  quests,
                  studentTest,
                  avg:
                    +Math.round(
                      (STUDENTS_RIGHT / test?.TEMPLATE_TEST?.length) * 100,
                    ) ?? 0,
                }
              }),
            )

            const descriptors = test.TEMPLATE_TEST.map((data) => {
              return {
                id: data?.TEG_ID,
                TEG_ORDEM: data?.TEG_ORDEM,
                cod: data?.TEG_MTI?.MTI_CODIGO,
                description: data?.TEG_MTI?.MTI_ID
                  ? `${data?.TEG_MTI?.MTI_CODIGO} - ${data?.TEG_MTI?.MTI_DESCRITOR}`
                  : '',
              }
            })

            return {
              id: test.TES_ID,
              subject: test.TES_DIS.DIS_NOME,
              type: 'table',

              quests: {
                total: descriptors.length,
                descriptors,
              },
              students: STUDENTS_TEST,
            }
          } else {
            const students = await Promise.all(
              idsStudents?.map(async (ALU_ID) => {
                const { student, studentTest } =
                  await this.generalSynthesisRepository.getInfoStudent(
                    +ALU_ID,
                    test?.TES_ID,
                    schoolClass,
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

            const resultDataReading = students.reduce(
              (acc, cur) => {
                return {
                  ...acc,
                  [cur.type]: acc[cur.type] + 1,
                }
              },
              {
                fluente: 0,
                nao_fluente: 0,
                frases: 0,
                palavras: 0,
                silabas: 0,
                nao_leitor: 0,
                nao_avaliado: 0,
                nao_informado: 0,
              },
            )

            return {
              id: test.TES_ID,
              subject: test.TES_DIS.DIS_NOME,
              optionsReading: leitorBySerie[detailsSerie?.SER_NUMBER],
              numberSerie: detailsSerie?.SER_NUMBER,
              type: 'table',
              students,
              dataGraph: {
                ...resultDataReading,
              },
            }
          }
        }),
      )
    }

    return {
      items,
    }
  }

  async handle(paginationParams: PaginationParams, user: User) {
    const params = formatParamsByProfile(paginationParams, user)

    const {
      county,
      edition,
      serie,
      school,
      stateRegionalId,
      municipalityOrUniqueRegionalId,
      stateId,
      schoolClass,
    } = params

    if (schoolClass) {
      return await this.getReportSchoolClass(params)
    }

    const { reports } =
      await this.generalSynthesisRepository.getDataReports(params)

    const { exams } =
      await this.generalSynthesisRepository.getExamsBySerieAndEdition(
        +edition,
        +serie,
      )

    let level = ''
    let items = []

    if (reports?.length) {
      items = exams.map((test) => {
        let totalGradesStudents = 0
        let countPresentStudents = 0
        const values = reports
          .map((report) => {
            let id
            let name = ''
            let type = null

            if (school) {
              id = report.schoolClass?.TUR_ID
              name = report.schoolClass?.TUR_NOME
              level = 'schoolClass'
            } else if (municipalityOrUniqueRegionalId) {
              id = report.school?.ESC_ID
              name = report.school?.ESC_NOME
              type = report.school?.ESC_TIPO
              level = 'school'
            } else if (county) {
              id = report.regional?.id
              name = report.regional?.name
              level = 'regionalSchool'
            } else if (stateRegionalId) {
              id = report.county?.MUN_ID
              name = report.county?.MUN_NOME
              level = 'county'
            } else if (stateId) {
              id = report.regional?.id
              name = report.regional?.name
              level = 'regional'
            } else if (edition) {
              id = report.county?.MUN_ID
              name = report.county?.MUN_NOME
              level = 'county'
            }

            const findTest = report.reportsSubjects.find(
              (testReport) => testReport.test.TES_ID === test.TES_ID,
            )

            if (!findTest) {
              return null
            }

            totalGradesStudents += Number(findTest.totalGradesStudents)
            countPresentStudents += Number(findTest.countPresentStudents)
            const value = Math.round(
              Number(findTest.totalGradesStudents) /
                Number(findTest.countPresentStudents),
            )

            return {
              ...findTest,
              id,
              name,
              type,
              value: value || 0,
            }
          })
          .filter((item) => item)

        const calcNumbers = this.calculateMinMedMax([
          ...values.map((data) => data.value),
        ])

        const resultDataReading = values.reduce(
          (acc, cur) => {
            return {
              fluente: +acc.fluente + +cur.fluente,
              nao_fluente: +acc.nao_fluente + +cur.nao_fluente,
              frases: +acc.frases + +cur.frases,
              palavras: +acc.palavras + +cur.palavras,
              silabas: +acc.silabas + +cur.silabas,
              nao_leitor: +acc.nao_leitor + +cur.nao_leitor,
              nao_avaliado: +acc.nao_avaliado + +cur.nao_avaliado,
              nao_informado: +acc.nao_informado + +cur.nao_informado,
            }
          },
          {
            fluente: 0,
            nao_fluente: 0,
            frases: 0,
            palavras: 0,
            silabas: 0,
            nao_leitor: 0,
            nao_avaliado: 0,
            nao_informado: 0,
          },
        )

        return {
          id: test.TES_ID,
          subject: test.TES_DIS.DIS_NOME,
          typeSubject: test.TES_DIS.DIS_TIPO,
          level,
          type: 'bar',
          items: values,
          ...calcNumbers,
          avg: Math.round(totalGradesStudents / countPresentStudents),
          dataGraph: {
            ...resultDataReading,
          },
        }
      })
    }

    return {
      items,
    }
  }

  async generateCsv(paginationParams: PaginationParams, user: User) {
    const { year, edition, county, school } = paginationParams

    const series = await this.connection.getRepository(Serie).find({
      where: {
        SER_ATIVO: true,
      },
    })

    delete paginationParams?.schoolClass
    const findEdition = await this.connection
      .getRepository(Assessment)
      .findOne({
        where: {
          AVA_ID: edition,
        },
      })

    const findCounty = await this.connection.getRepository(County).findOne({
      where: {
        MUN_ID: county,
      },
    })

    const findSchool = await this.connection.getRepository(School).findOne({
      where: {
        ESC_ID: school,
      },
    })

    const items = []

    for (const serie of series) {
      const data = await this.handle(
        {
          ...paginationParams,
          serie: String(serie.SER_ID),
        },
        user,
      )

      const dataSynthesisForSerie = {
        serie,
        ...data,
      }

      items.push(dataSynthesisForSerie)
    }

    const data = []

    const base_consulta = `${year} > ${findEdition?.AVA_NOME}${
      county ? ` > ${findCounty?.MUN_NOME}` : ''
    }${school ? ` > ${findSchool?.ESC_NOME}` : ''}`

    items?.forEach((item) => {
      item.items.forEach((subject) => {
        subject.items.forEach((subjectItem) => {
          const formattedDataSubject =
            subject.typeSubject === 'Objetiva'
              ? {
                  serie: item?.serie?.SER_NOME ?? '',
                  disciplina: subject?.subject ?? '',
                  base_consulta,
                  nivel_consulta: subjectItem?.name ?? '',
                  total_alunos: subjectItem.countTotalStudents,
                  total_participantes: subjectItem.countPresentStudents,
                  objetiva_total_acertos: subjectItem.totalGradesStudents,
                  fluente: '-',
                  nao_fluente: '-',
                  frases: '-',
                  palavras: '-',
                  silabas: '-',
                  nao_leitor: '-',
                  nao_avaliado: '-',
                  nao_informado: '-',
                }
              : {
                  serie: item?.serie?.SER_NOME ?? '',
                  disciplina: subject?.subject ?? '',
                  base_consulta,
                  nivel_consulta: subjectItem?.name ?? '',
                  total_alunos: subjectItem.countTotalStudents,
                  total_participantes: subjectItem.countPresentStudents,
                  objetiva_total_acertos: 0,
                  fluente: subjectItem.fluente,
                  nao_fluente: subjectItem.nao_fluente,
                  frases: subjectItem.frases,
                  palavras: subjectItem.palavras,
                  silabas: subjectItem.silabas,
                  nao_leitor: subjectItem.nao_leitor,
                  nao_avaliado: subjectItem.nao_avaliado,
                  nao_informado: subjectItem.nao_informado,
                }
          data.push(formattedDataSubject)
        })
      })
    })

    const parser = new Parser({
      quote: ' ',
      withBOM: true,
    })

    try {
      const csv = parser.parse(data)
      return csv
    } catch (error) {
      console.log('error csv:', error.message)
    }
  }

  calculateMinMedMax(numbers: number[]) {
    const min = Math.min(...numbers)
    const max = Math.max(...numbers)

    const total = numbers.reduce((acc, cur) => acc + cur, 0)
    const avg = Math.round(total / numbers.length)

    return {
      min,
      max,
      avg,
    }
  }
}
