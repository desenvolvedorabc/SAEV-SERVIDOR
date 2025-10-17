import { Injectable } from '@nestjs/common'
import { InjectConnection } from '@nestjs/typeorm'
import { Parser } from 'json2csv'
import { PaginationParams } from 'src/helpers/params'
import { County } from 'src/modules/counties/model/entities/county.entity'
import { School } from 'src/modules/school/model/entities/school.entity'
import { SchoolClass } from 'src/modules/school-class/model/entities/school-class.entity'
import { Serie } from 'src/modules/serie/model/entities/serie.entity'
import { Subject } from 'src/modules/subject/model/entities/subject.entity'
import { User } from 'src/modules/user/model/entities/user.entity'
import { formatParamsByProfile } from 'src/utils/format-params-by-profile'
import { Connection } from 'typeorm'

import { ReportRaceRepository } from '../repositories/race.repository'

@Injectable()
export class ReportRaceService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,

    private readonly raceRepository: ReportRaceRepository,
  ) {}

  async handle(paginationParams: PaginationParams, user: User) {
    const params = formatParamsByProfile(paginationParams, user)

    const { serie } = params

    const currentSerie = await this.connection
      .getRepository(Serie)
      .findOne(serie)

    const subjects = await this.connection.getRepository(Subject).find({
      where: {
        DIS_ATIVO: true,
      },
    })

    const { reports: data } = await this.raceRepository.getDataReports(params)

    const reports = data.sort((a, b) => b?.edition?.AVA_ID - a?.edition?.AVA_ID)
    let items = []

    if (reports?.length) {
      items = subjects.map((subject) => {
        const values = reports
          .map((report) => {
            const findTest = report?.reportsSubjects?.find(
              (testReport) => testReport.test.TES_DIS.DIS_ID === subject.DIS_ID,
            )

            if (!findTest) {
              return null
            }

            let totalStudents = 0
            let rightQuestionsForLeitura = 0
            let RacesArray = []

            findTest.reportRaces.map((rac) => {
              let totalPercent = 0

              if (subject.DIS_TIPO === 'Objetiva') {
                totalStudents += rac.countPresentStudents
                totalPercent =
                  Math.round(
                    rac.totalGradesStudents / rac.countPresentStudents,
                  ) || 0
              } else {
                let rightQuestions = 0
                switch (currentSerie.SER_NUMBER) {
                  case 1:
                    rightQuestions = rac.fluente + rac.nao_fluente + rac.frases
                    break
                  case 2:
                  case 3:
                    rightQuestions = rac.fluente + rac.nao_fluente
                    break
                  default:
                    rightQuestions = rac.fluente
                    break
                }

                rightQuestionsForLeitura += rightQuestions
                totalStudents += rac.countTotalStudents

                totalPercent = Math.round(
                  (rightQuestions / rac.countTotalStudents) * 100,
                )
              }

              RacesArray.push({
                id: rac.id,
                name: rac.name,
                total: rac.countTotalStudents,
                total_percent: totalPercent || 0,
                countTotalStudents: rac.countTotalStudents,
                totalGradesStudents: rac.totalGradesStudents,
                countPresentStudents: rac.countPresentStudents,
                fluente: rac.fluente,
                nao_fluente: rac.nao_fluente,
                frases: rac.frases,
                palavras: rac.palavras,
                silabas: rac.silabas,
                nao_leitor: rac.nao_leitor,
                nao_avaliado: rac.nao_avaliado,
                nao_informado: rac.nao_informado,
              })
            })

            let totalPercent = 0
            if (subject.DIS_TIPO === 'Objetiva') {
              totalPercent = Math.round(
                +findTest.totalGradesStudents / +findTest.countPresentStudents,
              )
            } else {
              totalPercent = Math.round(
                (+rightQuestionsForLeitura / +totalStudents) * 100,
              )
            }

            RacesArray = RacesArray.sort((a, b) => a.name.localeCompare(b.name))

            return {
              id: report.edition.AVA_ID,
              name: report.edition.AVA_NOME,
              total_percent: totalPercent || 0,
              races: RacesArray,
            }
          })
          .filter((item) => item)

        return {
          id: subject.DIS_ID,
          subject: subject.DIS_NOME,
          typeSubject: subject.DIS_TIPO,
          items: values,
        }
      })
    }

    return {
      items,
    }
  }

  async generateCsv(paginationParams: PaginationParams, user: User) {
    const { year, county, school, serie, schoolClass } = paginationParams

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

    const baseConsulta = `${year} > ${findSerie?.SER_NOME}${
      county ? ` > ${findCounty?.MUN_NOME}` : ''
    }${school ? ` > ${findSchool?.ESC_NOME}` : ''}${
      schoolClass ? ` > ${findSchoolClass?.TUR_NOME}` : ''
    }`

    items.forEach((subject) => {
      subject.items.forEach((subjectItem) => {
        subjectItem.races.forEach((race) => {
          const formattedDataSubject =
            subject.typeSubject === 'Objetiva'
              ? {
                  disciplina: subject?.subject ?? '',
                  base_consulta: baseConsulta,
                  edicao: subjectItem?.name ?? '',
                  total_geral: `${subjectItem?.total_percent}%`,
                  nome_raca: race.name,
                  total_raca: `${race.total_percent}%`,
                  total_alunos: race.countTotalStudents,
                  total_participantes: race.countPresentStudents,
                  objetiva_total_acertos: race.totalGradesStudents,
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
                  disciplina: subject?.subject ?? '',
                  base_consulta: baseConsulta,
                  edicao: subjectItem?.name ?? '',
                  total_geral: `${subjectItem?.total_percent}%`,
                  nome_raca: race.name,
                  total_raca: `${race.total_percent}%`,
                  total_alunos: race.countTotalStudents,
                  total_participantes: race.countPresentStudents,
                  objetiva_total_acertos: 0,
                  fluente: race.fluente,
                  nao_fluente: race.nao_fluente,
                  frases: race.frases,
                  palavras: race.palavras,
                  silabas: race.silabas,
                  nao_leitor: race.nao_leitor,
                  nao_avaliado: race.nao_avaliado,
                  nao_informado: race.nao_informado,
                }
          data.push(formattedDataSubject)
        })
      })
    })

    const parser = new Parser({
      quote: ' ',
      withBOM: true,
    })

    if (!items.length) {
      data.push({
        disciplina: '-',
        base_consulta: '-',
        edicao: '-',
        total_geral: '-',
        nome_raca: '-',
        total_alunos: '-',
        total_participantes: '-',
        objetiva_total_acertos: '-',
        fluente: '-',
        nao_fluente: '-',
        frases: '-',
        palavras: '-',
        silabas: '-',
        nao_leitor: '-',
        nao_avaliado: '-',
        nao_informado: '-',
      })
    }

    try {
      const csv = parser.parse(data)
      return csv
    } catch (error) {
      console.log('error csv:', error.message)
    }
  }
}
