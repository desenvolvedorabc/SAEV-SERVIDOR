import { Injectable } from '@nestjs/common'
import { InjectConnection, InjectRepository } from '@nestjs/typeorm'
import * as _ from 'lodash'
import { PaginationParams } from 'src/helpers/params'
import { Assessment } from 'src/modules/assessment/model/entities/assessment.entity'
import { StudentTest } from 'src/modules/release-results/model/entities/student-test.entity'
import { StudentTestAnswer } from 'src/modules/release-results/model/entities/student-test-answer.entity'
import { TypeSchoolEnum } from 'src/modules/school/model/enum/type-school.enum'
import { Student } from 'src/modules/student/model/entities/student.entity'
import { User } from 'src/modules/user/model/entities/user.entity'
import { formatParamsByProfile } from 'src/utils/format-params-by-profile'
import { Connection, Repository } from 'typeorm'

import { ReportEdition } from '../model/entities/report-edition.entity'
import { GeneralSynthesisRepository } from '../repositories/general-synthesis.repository'
import { PerformanceLevelRepository } from '../repositories/performance-level.repository'

@Injectable()
export class PerformanceLevelService {
  constructor(
    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,

    private readonly generalSynthesisRepository: GeneralSynthesisRepository,
    private readonly performanceLevelRepository: PerformanceLevelRepository,

    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async getResultBySchoolClass({
    serie,
    edition,
    schoolClass,
    typeSchool,
    verifyProfileForState,
  }: PaginationParams) {
    const queryBuilder = this.assessmentRepository
      .createQueryBuilder('Assessment')
      .leftJoinAndSelect('Assessment.AVA_TES', 'AVA_TES')
      .innerJoin('AVA_TES.TES_SER', 'TES_SER', `TES_SER.SER_ID IN (:series)`, {
        series: serie?.split(','),
      })
      .leftJoinAndSelect('AVA_TES.TEMPLATE_TEST', 'TEMPLATE_TEST')
      .leftJoinAndSelect('TEMPLATE_TEST.TEG_MTI', 'TEG_MTI')
      .leftJoinAndSelect('AVA_TES.TES_DIS', 'TES_DIS')
      .where('TES_DIS.DIS_TIPO != :type', { type: 'Leitura' })

    const queryBuilderSubject = await this.connection
      .getRepository(ReportEdition)
      .createQueryBuilder('ReportEdition')
      .innerJoinAndSelect('ReportEdition.reportsSubjects', 'reportsSubjects')
      .innerJoin('reportsSubjects.test', 'test')
      .innerJoin('ReportEdition.schoolClass', 'schoolClass')
      .innerJoin('schoolClass.TUR_MUN', 'county')
      .innerJoin('test.TES_SER', 'TES_SER', `TES_SER.SER_ID = :serie`, {
        serie,
      })
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

    if (edition) {
      queryBuilder.andWhere('Assessment.AVA_ID = :AVA_ID', {
        AVA_ID: edition,
      })
    }

    const ava = await queryBuilder.getOne()

    let items = []

    if (ava && idsStudents?.length) {
      items = await Promise.all(
        ava?.AVA_TES?.map(async (test) => {
          let DESCRIPTORS_TEMPLATE = test.TEMPLATE_TEST.filter(function (a) {
            return (
              !this[JSON.stringify(a?.TEG_MTI?.MTI_ID)] &&
              (this[JSON.stringify(a?.TEG_MTI?.MTI_ID)] = true)
            )
          }, Object.create(null))

          DESCRIPTORS_TEMPLATE = DESCRIPTORS_TEMPLATE.sort((a, b) => {
            if (a?.TEG_MTI?.MTI_CODIGO < b?.TEG_MTI?.MTI_CODIGO) {
              return -1
            } else {
              return 1
            }
          })

          let totalRightSchoolClass = 0
          let totalQuestionSchoolClass = 0

          const totalDescriptors = []

          const STUDENTS_TEST = await Promise.all(
            idsStudents.map(async (ALU_ID) => {
              const student = await this.connection
                .getRepository(Student)
                .createQueryBuilder('Student')
                .select(['Student.ALU_ID', 'Student.ALU_NOME'])
                .where('Student.ALU_ID = :idStudent', { idStudent: ALU_ID })
                .getOne()

              const studentTest = await this.connection
                .getRepository(StudentTest)
                .createQueryBuilder('ALUNO_TESTE')
                .innerJoinAndSelect('ALUNO_TESTE.ANSWERS_TEST', 'ANSWERS_TEST')
                .leftJoinAndSelect(
                  'ANSWERS_TEST.questionTemplate',
                  'questionTemplate',
                )
                .leftJoinAndSelect('questionTemplate.TEG_MTI', 'TEG_MTI')
                .where(
                  `ALUNO_TESTE.ALT_ALU_ID = '${ALU_ID}' AND ALUNO_TESTE.ALT_TES_ID = '${test?.TES_ID}'`,
                )
                .andWhere('ALUNO_TESTE.schoolClass = :schoolClass', {
                  schoolClass,
                })
                .getOne()

              const ANSWERS_TEST = studentTest?.ANSWERS_TEST?.filter(
                (arr, index, self) =>
                  index ===
                  self.findIndex(
                    (t) =>
                      t?.questionTemplate?.TEG_ID ===
                      arr?.questionTemplate?.TEG_ID,
                  ),
              )

              const descriptors = DESCRIPTORS_TEMPLATE.map((data) => {
                const answersDescriptors: StudentTestAnswer[] = []

                ANSWERS_TEST?.forEach((answer) => {
                  if (
                    answer?.questionTemplate?.TEG_MTI?.MTI_ID ===
                    data?.TEG_MTI?.MTI_ID
                  ) {
                    answersDescriptors.push(answer)
                  }
                  totalQuestionSchoolClass += 1
                  if (answer?.ATR_CERTO) {
                    totalRightSchoolClass += 1
                  }
                })

                const STUDENTS_RIGHT = answersDescriptors.reduce(
                  (sum, cur) => {
                    if (cur.ATR_CERTO) {
                      return {
                        right: sum.right + 1,
                        total: sum.total + 1,
                      }
                    } else {
                      return {
                        right: sum.right,
                        total: sum.total + 1,
                      }
                    }
                  },
                  {
                    right: 0,
                    total: 0,
                  },
                )

                return {
                  id: data.TEG_ID,
                  cod: data.TEG_MTI?.MTI_CODIGO,
                  description: data.TEG_MTI?.MTI_DESCRITOR,
                  totalCorrect: STUDENTS_RIGHT.right,
                  total: STUDENTS_RIGHT.total,
                  value:
                    +Math.round(
                      (STUDENTS_RIGHT.right / STUDENTS_RIGHT.total) * 100,
                    ) ?? 0,
                }
              })

              totalDescriptors.push(...descriptors)

              const STUDENTS_RIGHT = ANSWERS_TEST?.reduce((sum, cur) => {
                if (cur?.ATR_CERTO) {
                  return sum + 1
                } else {
                  return sum
                }
              }, 0)

              return {
                id: student.ALU_ID,
                name: student.ALU_NOME,
                value: STUDENTS_RIGHT
                  ? +Math.round(
                      (STUDENTS_RIGHT / test?.TEMPLATE_TEST?.length) * 100,
                    )
                  : 0,
                descriptors,
              }
            }),
          )

          const dataGroupped = _.groupBy(
            totalDescriptors,
            (line) => line.id + ' ' + line.cod,
          )

          const keyTurmas = Object.keys(dataGroupped)

          const descriptors = keyTurmas.map((key) => {
            const reduce = dataGroupped[key].reduce(
              (acc, cur) => {
                return {
                  total: acc.total + cur?.total,
                  totalCorrect: acc.totalCorrect + cur?.totalCorrect,
                }
              },
              {
                total: 0,
                totalCorrect: 0,
              },
            )

            return {
              id: dataGroupped[key][0]?.id,
              cod: dataGroupped[key][0]?.cod,
              description: dataGroupped[key][0]?.description,
              value: Math.round((reduce.totalCorrect / reduce.total) * 100),
            }
          })

          const TOTAL_STUDENTS =
            this.calculateTotalQuestionsUsersByLevel(STUDENTS_TEST)
          return {
            id: test.TES_DIS.DIS_ID,
            name: test.TES_DIS.DIS_NOME,
            type: test.TES_DIS.DIS_TIPO,
            TOTAL_STUDENTS,
            descriptors,
            DESCRIPTORS_TEMPLATE,
            value: Math.round(
              (totalRightSchoolClass / totalQuestionSchoolClass) * 100,
            ),
            items: STUDENTS_TEST,
          }
        }),
      )
    }

    return {
      items,
      meta: {
        totalItems: 0,
        itemCount: 0,
        totalPages: 0,
      },
    }
  }

  async handle(paginationParams: PaginationParams, user: User) {
    const params = formatParamsByProfile(paginationParams, user)

    const {
      county,
      edition,
      school,
      serie,
      schoolClass,
      municipalityOrUniqueRegionalId,
      stateId,
      stateRegionalId,
    } = params

    if (schoolClass) {
      return await this.getResultBySchoolClass(params)
    }

    const { exams } =
      await this.performanceLevelRepository.getExamsBySerieAndEdition(
        +edition,
        +serie,
      )

    const { reports: reportsDescriptors } =
      await this.performanceLevelRepository.getDataReports(params)

    const { reports } =
      await this.generalSynthesisRepository.getDataReports(params)

    let formattedSubjects = []
    if (reportsDescriptors?.length) {
      formattedSubjects = exams?.map((test) => {
        let isExistsDescriptorInSubject = false
        const totalDescriptors = []
        let totalGradesStudents = 0
        let countPresentStudents = 0
        const items = reportsDescriptors.map((reportEditionDescriptor) => {
          const editionReportSubject = reports.find(
            (editionReportSubject) =>
              editionReportSubject.id === reportEditionDescriptor.id,
          )

          let id
          let name = ''
          let type = null

          if (school) {
            id = reportEditionDescriptor.schoolClass?.TUR_ID
            name = reportEditionDescriptor.schoolClass?.TUR_NOME
          } else if (municipalityOrUniqueRegionalId) {
            id = reportEditionDescriptor.school?.ESC_ID
            name = reportEditionDescriptor.school?.ESC_NOME
            type = reportEditionDescriptor.school?.ESC_TIPO
          } else if (county) {
            id = reportEditionDescriptor.regional?.id
            name = reportEditionDescriptor.regional?.name
          } else if (stateRegionalId) {
            id = reportEditionDescriptor.county?.MUN_ID
            name = reportEditionDescriptor.county?.MUN_NOME
          } else if (stateId) {
            id = reportEditionDescriptor.regional?.id
            name = reportEditionDescriptor.regional?.name
          } else if (edition) {
            id = reportEditionDescriptor.county?.MUN_ID
            name = reportEditionDescriptor.county?.MUN_NOME
          }

          let descriptors = []
          reportEditionDescriptor?.reports_descriptors?.forEach(
            (reportDescriptor) => {
              if (test?.TES_ID === reportDescriptor?.test?.TES_ID) {
                isExistsDescriptorInSubject = true

                const data = {
                  id: reportDescriptor.descriptor.MTI_ID,
                  cod: reportDescriptor.descriptor.MTI_CODIGO,
                  testId: reportDescriptor.test.TES_ID,
                  description: reportDescriptor.descriptor.MTI_DESCRITOR,
                  totalCorrect: +reportDescriptor.totalCorrect,
                  total: +reportDescriptor.total,
                  value:
                    +Math.round(
                      (+reportDescriptor.totalCorrect /
                        +reportDescriptor.total) *
                        100,
                    ) ?? 0,
                }

                descriptors.push(data)
                totalDescriptors.push(data)
              }
            },
          )

          const reportSubject = editionReportSubject?.reportsSubjects?.find(
            (subject) => subject.test.TES_ID === descriptors[0]?.testId,
          )

          descriptors = descriptors.sort((a, b) => {
            if (a.cod < b.cod) {
              return -1
            } else {
              return 1
            }
          })

          if (reportSubject?.countPresentStudents) {
            totalGradesStudents += +reportSubject?.totalGradesStudents
            countPresentStudents += +reportSubject?.countPresentStudents
          }

          return {
            id,
            name,
            type,
            value: +reportSubject?.countPresentStudents
              ? Math.round(
                  +reportSubject?.totalGradesStudents /
                    +reportSubject?.countPresentStudents,
                )
              : 0,
            descriptors,
          }
        })

        const total = this.calculateTotalQuestionsUsersByLevel(items)

        const dataGroupped = _.groupBy(
          totalDescriptors,
          (line) => line.id + ' ' + line.cod,
        )

        const keyTurmas = Object.keys(dataGroupped)

        const descriptors = keyTurmas.map((key) => {
          const reduce = dataGroupped[key].reduce(
            (acc, cur) => {
              return {
                total: acc.total + cur?.total,
                totalCorrect: acc.totalCorrect + cur?.totalCorrect,
              }
            },
            {
              total: 0,
              totalCorrect: 0,
            },
          )

          return {
            id: dataGroupped[key][0]?.id,
            cod: dataGroupped[key][0]?.cod,
            description: dataGroupped[key][0]?.description,
            value: Math.round((reduce.totalCorrect / reduce.total) * 100),
          }
        })

        return {
          id: test.TES_DIS.DIS_ID,
          name: test.TES_DIS.DIS_NOME,
          type: test.TES_DIS.DIS_TIPO,
          isExistsDescriptorInSubject,
          TOTAL_STUDENTS: total,
          items,
          value: Math.round(totalGradesStudents / countPresentStudents),
          descriptors,
        }
      })
    }
    formattedSubjects = formattedSubjects.filter(
      (data) => !!data.isExistsDescriptorInSubject,
    )

    return {
      items: formattedSubjects,
    }
  }

  private calculateTotalQuestionsUsersByLevel(data: any): {
    TOTAL: number
    ONE: number
    TWO: number
    TREE: number
    FOUR: number
  } {
    const total = data?.reduce(
      (sum, cur: any) => {
        const value = cur.value

        if (value >= 75) {
          return {
            ...sum,
            FOUR: sum.FOUR + 1,
            TOTAL: sum.TOTAL + 1,
          }
        } else if (value >= 50) {
          return {
            ...sum,
            TREE: sum.TREE + 1,
            TOTAL: sum.TOTAL + 1,
          }
        } else if (value >= 25) {
          return {
            ...sum,
            TWO: sum.TWO + 1,
            TOTAL: sum.TOTAL + 1,
          }
        } else {
          return {
            ...sum,
            ONE: sum.ONE + 1,
            TOTAL: sum.TOTAL + 1,
          }
        }
      },
      {
        ONE: 0,
        TWO: 0,
        TREE: 0,
        FOUR: 0,
        TOTAL: 0,
      },
    )

    return total
  }
}
