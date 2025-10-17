import { Injectable } from '@nestjs/common'
import { InjectConnection, InjectRepository } from '@nestjs/typeorm'
import { Parser } from 'json2csv'
import { PaginationParams } from 'src/helpers/params'
import { Assessment } from 'src/modules/assessment/model/entities/assessment.entity'
import { County } from 'src/modules/counties/model/entities/county.entity'
import { School } from 'src/modules/school/model/entities/school.entity'
import { TypeSchoolEnum } from 'src/modules/school/model/enum/type-school.enum'
import { SchoolClass } from 'src/modules/school-class/model/entities/school-class.entity'
import { Serie } from 'src/modules/serie/model/entities/serie.entity'
import { User } from 'src/modules/user/model/entities/user.entity'
import { formatParamsByProfile } from 'src/utils/format-params-by-profile'
import { Connection, Repository } from 'typeorm'

import { ReportEdition } from '../model/entities/report-edition.entity'
import { NotEvaluatedRepository } from '../repositories/not-evaluated.repository'

@Injectable()
export class NotEvaluatedService {
  constructor(
    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,

    @InjectConnection()
    private readonly connection: Connection,

    private readonly notEvaluationRepository: NotEvaluatedRepository,
  ) {}

  async getResultsBySchoolClass({
    serie,
    edition,
    schoolClass,
    typeSchool,
    verifyProfileForState,
  }: PaginationParams) {
    const queryBuilderSubject = await this.connection
      .getRepository(ReportEdition)
      .createQueryBuilder('ReportEdition')
      .addSelect(['ReportEdition.id'])
      .innerJoinAndSelect(
        'ReportEdition.reports_not_evaluated',
        'reports_not_evaluated',
      )
      .innerJoin('ReportEdition.schoolClass', 'schoolClass')
      .innerJoin('schoolClass.TUR_MUN', 'county')
      .innerJoin('reports_not_evaluated.test', 'test')
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

    const idsStudents = reportEdition?.reports_not_evaluated[0]?.idStudents

    const queryBuilder = this.assessmentRepository
      .createQueryBuilder('Assessment')
      .leftJoinAndSelect('Assessment.AVA_TES', 'AVA_TES')
      .innerJoin('AVA_TES.TES_SER', 'TES_SER', `TES_SER.SER_ID IN (:series)`, {
        series: serie?.split(','),
      })
      .leftJoinAndSelect('AVA_TES.TEMPLATE_TEST', 'TEMPLATE_TEST')
      .leftJoinAndSelect('TEMPLATE_TEST.TEG_MTI', 'TEG_MTI')
      .leftJoinAndSelect('AVA_TES.TES_DIS', 'TES_DIS')

    if (edition) {
      queryBuilder.andWhere('Assessment.AVA_ID = :AVA_ID', {
        AVA_ID: edition,
      })
    }

    const ava = await queryBuilder.getOne()

    let items = []

    if (!!ava?.AVA_TES?.length && idsStudents?.length) {
      items = await Promise.all(
        ava?.AVA_TES?.map(async (test) => {
          const STUDENTS_TEST = await Promise.all(
            idsStudents?.map(async (studentId) => {
              const { student, studentTest } =
                await this.notEvaluationRepository.getInfoStudent(
                  +studentId,
                  test?.TES_ID,
                  schoolClass,
                )

              const options = {
                'Recusou-se a participar': 'recusa',
                'Faltou mas está Frequentando a escola': 'ausencia',
                'Abandonou a escola': 'abandono',
                'Foi Transferido para outra escola': 'transferencia',
                'Não participou por motivo de deficiência': 'deficiencia',
                'Motivos de deficiência': 'deficiencia',
                'Não participou': 'nao_participou',
              }

              let justificativa = null

              if (studentTest?.ALT_JUSTIFICATIVA) {
                const option = studentTest.ALT_JUSTIFICATIVA.trim() ?? undefined
                justificativa = options[option]
              }

              return {
                id: student.ALU_ID,
                name: student.ALU_NOME,
                justificativa,
                studentTest,
              }
            }),
          )

          const resultDataReading = STUDENTS_TEST.reduce(
            (acc, cur) => {
              return {
                recusa:
                  cur.justificativa === 'recusa' ? acc.recusa + 1 : acc.recusa,
                ausencia:
                  cur.justificativa === 'ausencia'
                    ? acc.ausencia + 1
                    : acc.ausencia,
                abandono:
                  cur.justificativa === 'abandono'
                    ? acc.abandono + 1
                    : acc.abandono,
                transferencia:
                  cur.justificativa === 'transferencia'
                    ? acc.transferencia + 1
                    : acc.transferencia,
                deficiencia:
                  cur.justificativa === 'deficiencia'
                    ? acc.deficiencia + 1
                    : acc.deficiencia,
                nao_participou:
                  cur.justificativa === 'nao_participou'
                    ? acc.nao_participou + 1
                    : acc.nao_participou,
                total_enturmados: acc.total_enturmados + 1,
                total_alunos: acc.total_alunos + 1,
              }
            },
            {
              recusa: 0,
              ausencia: 0,
              abandono: 0,
              transferencia: 0,
              deficiencia: 0,
              nao_participou: 0,
              total_enturmados: 0,
              total_alunos: 0,
            },
          )

          return {
            id: test.TES_ID,
            subject: test.TES_DIS.DIS_NOME,
            level: 'student',
            type: 'table',
            students: STUDENTS_TEST,
            dataGraph: {
              ...resultDataReading,
            },
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
      school,
      schoolClass,
      serie,
      stateId,
      stateRegionalId,
      municipalityOrUniqueRegionalId,
    } = params

    if (schoolClass) {
      return await this.getResultsBySchoolClass(params)
    }

    const { exams } =
      await this.notEvaluationRepository.getExamsBySerieAndEdition(
        +edition,
        +serie,
      )

    const { reports } = await this.notEvaluationRepository.getDataReport(params)

    let level = ''
    let items = []

    if (!schoolClass && reports?.length) {
      items = exams.map((test) => {
        const values = reports
          .map((report) => {
            let id
            let name = ''
            let type = ''

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

            const findTest = report.reports_not_evaluated.find(
              (testReport) => testReport.test.TES_ID === test.TES_ID,
            )

            if (!findTest) {
              return null
            }

            return {
              ...findTest,
              id,
              name,
              type,
            }
          })
          .filter((item) => item)

        const resultDataReading = values.reduce(
          (acc, cur) => {
            return {
              recusa: +acc.recusa + +cur.recusa,
              ausencia: +acc.ausencia + +cur.ausencia,
              abandono: +acc.abandono + +cur.abandono,
              transferencia: +acc.transferencia + +cur.transferencia,
              deficiencia: +acc.deficiencia + +cur.deficiencia,
              nao_participou: +acc.nao_participou + +cur.nao_participou,
              total_alunos: +acc.total_alunos + +cur.countTotalStudents,
              total_enturmados: +acc.total_enturmados + +cur.countTotalStudents,
              total_nao_avaliados: 0,
              total_lancados: +acc.total_lancados + +cur.countStudentsLaunched,
            }
          },
          {
            recusa: 0,
            ausencia: 0,
            abandono: 0,
            transferencia: 0,
            deficiencia: 0,
            nao_participou: 0,
            total_alunos: 0,
            total_enturmados: 0,
            total_lancados: 0,
            total_nao_avaliados: 0,
          },
        )

        resultDataReading.total_nao_avaliados =
          +resultDataReading.recusa +
          +resultDataReading.ausencia +
          +resultDataReading.abandono +
          +resultDataReading.transferencia +
          +resultDataReading.deficiencia +
          +resultDataReading.nao_participou

        return {
          id: test.TES_ID,
          subject: test.TES_DIS.DIS_NOME,
          typeSubject: test.TES_DIS.DIS_TIPO,
          level,
          type: 'bar',
          items: values,
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
    const { year, edition, county, school, serie, schoolClass } =
      paginationParams

    const findEdition = await this.connection
      .getRepository(Assessment)
      .findOne({
        where: {
          AVA_ID: edition,
        },
      })

    const findSerie = await this.connection.getRepository(Serie).findOne({
      where: {
        SER_ID: serie,
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

    const findSchoolClass = await this.connection
      .getRepository(SchoolClass)
      .findOne({
        where: {
          TUR_ID: schoolClass,
        },
      })

    const { items } = await this.handle(
      {
        ...paginationParams,
        serie,
      },
      user,
    )

    const data = []

    const base_consulta = `${year} > ${findEdition?.AVA_NOME}${
      county ? ` > ${findCounty?.MUN_NOME}` : ''
    }${school ? ` > ${findSchool?.ESC_NOME}` : ''}${schoolClass ? ` > ${findSchoolClass?.TUR_NOME}` : ''}`

    items.forEach((item) => {
      if (schoolClass) {
        item.students.forEach((student) => {
          const formattedDataSubject = {
            serie: findSerie?.SER_NOME ?? '',
            disciplina: item?.subject ?? '',
            base_consulta,
            name: student?.name ?? '',
            justificativa: student?.studentTest?.ALT_JUSTIFICATIVA?.trim()
              ? student?.studentTest?.ALT_JUSTIFICATIVA
              : 'N/A',
          }
          data.push(formattedDataSubject)
        })
      } else {
        item.items.forEach((subjectItem) => {
          const formattedDataSubject = {
            serie: findSerie?.SER_NOME ?? '',
            disciplina: item?.subject ?? '',
            base_consulta,
            nivel_consulta: subjectItem?.name ?? '',
            total_alunos: subjectItem.countTotalStudents,
            total_lancados: subjectItem.countStudentsLaunched,
            total_participantes: subjectItem.countPresentStudents,
            total_nao_avaliados:
              subjectItem.countStudentsLaunched -
              subjectItem.countPresentStudents,
            recusou_participar: subjectItem.recusa,
            faltou_mas_frequentando_escola: subjectItem.ausencia,
            abandonou_escola: subjectItem.abandono,
            transferido_para_outra_escola: subjectItem.transferencia,
            motivos_deficiencia: subjectItem.deficiencia,
            nao_participou: subjectItem.nao_participou,
          }
          data.push(formattedDataSubject)
        })
      }
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
}
