import { Injectable } from '@nestjs/common'
import { InjectConnection } from '@nestjs/typeorm'
import { Parser } from 'json2csv'
import { PaginationParams } from 'src/helpers/params'
import { Assessment } from 'src/modules/assessment/model/entities/assessment.entity'
import { County } from 'src/modules/counties/model/entities/county.entity'
import { options } from 'src/modules/jobs/constants/options'
import { School } from 'src/modules/school/model/entities/school.entity'
import { SchoolClass } from 'src/modules/school-class/model/entities/school-class.entity'
import { Serie } from 'src/modules/serie/model/entities/serie.entity'
import { User } from 'src/modules/user/model/entities/user.entity'
import { formatParamsByProfile } from 'src/utils/format-params-by-profile'
import { formatValueForPercentage } from 'src/utils/format-value-percentage'
import { Connection } from 'typeorm'

import { ReportSyntheticRepository } from '../repositories/synthetic.repository'
import { EvolutionaryLineReadingService } from './evolutionary-line-reading.service'

@Injectable()
export class ReportSyntheticService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,

    private readonly reportSyntheticRepository: ReportSyntheticRepository,
    private readonly evolutionaryLineReadingService: EvolutionaryLineReadingService,
  ) {}

  async handle(paginationParams: PaginationParams, user: User) {
    const params = formatParamsByProfile(paginationParams, user)

    const { items: itemsReading } =
      await this.evolutionaryLineReadingService.handle(paginationParams, user)

    const reportReading = itemsReading[0]?.subject

    const { report } =
      await this.reportSyntheticRepository.getDataReports(params)

    const optionsForReport = {
      A: 'total_a',
      B: 'total_b',
      C: 'total_c',
      D: 'total_d',
      '-': 'total_null',
    }

    const items = report?.reportsSubjects?.map((reportSubject) => {
      const items = reportSubject.reportQuestions
        .map((reportQuestion) => {
          const totalPresentStudents =
            +reportQuestion.total_a +
            +reportQuestion.total_b +
            +reportQuestion.total_c +
            +reportQuestion.total_d +
            +reportQuestion.total_null

          const reportOptions = options.map((option, index) => {
            return {
              id: index,
              option,
              totalCorrect: +reportQuestion[optionsForReport[option]],
              value: formatValueForPercentage(
                +reportQuestion[optionsForReport[option]],
                +totalPresentStudents,
              ),
              ...reportQuestion,
            }
          })

          const findQuestionCorrect = reportOptions?.find(
            (item) =>
              item?.option?.toUpperCase() ===
              reportQuestion?.option_correct?.toUpperCase(),
          )

          const reportReadingCorrect = {
            fluente: formatValueForPercentage(
              findQuestionCorrect?.fluente,
              reportReading?.fluente,
            ),
            nao_fluente: formatValueForPercentage(
              findQuestionCorrect?.nao_fluente,
              reportReading?.nao_fluente,
            ),
            silabas: formatValueForPercentage(
              findQuestionCorrect?.silabas,
              reportReading?.silabas,
            ),
            frases: formatValueForPercentage(
              findQuestionCorrect?.frases,
              reportReading?.frases,
            ),
            palavras: formatValueForPercentage(
              findQuestionCorrect?.palavras,
              reportReading?.palavras,
            ),
            nao_leitor: formatValueForPercentage(
              findQuestionCorrect?.nao_leitor,
              reportReading?.nao_leitor,
            ),
            nao_avaliado: formatValueForPercentage(
              findQuestionCorrect?.nao_avaliado,
              reportReading?.nao_avaliado,
            ),
            nao_informado: formatValueForPercentage(
              findQuestionCorrect?.nao_informado,
              reportReading?.nao_informado,
            ),
          }

          return {
            id: reportQuestion.question.TEG_ID,
            option: reportQuestion?.option_correct,
            order: reportQuestion.question.TEG_ORDEM,
            descriptor: reportQuestion.question.TEG_MTI.MTI_DESCRITOR,
            options: reportOptions,
            reportReadingCorrect,
          }
        })
        .sort((a, b) => a.order - b.order)

      return {
        id: reportSubject.test.TES_ID,
        subject: reportSubject.test.TES_DIS.DIS_NOME,
        typeSubject: reportSubject.test.TES_DIS.DIS_TIPO,
        items,
      }
    })

    console.log(items)

    return {
      items,
    }
  }

  async generateCsv(paginationParams: PaginationParams, user: User) {
    const { year, county, school, serie, schoolClass, edition } =
      paginationParams

    const findSerie = await this.connection.getRepository(Serie).findOne({
      where: {
        SER_ID: serie,
      },
    })

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

    const base_consulta = `${year} > ${findSerie?.SER_NOME} > ${
      findEdition?.AVA_NOME
    }${county ? ` > ${findCounty?.MUN_NOME}` : ''}${
      school ? ` > ${findSchool?.ESC_NOME}` : ''
    }${schoolClass ? ` > ${findSchoolClass?.TUR_NOME}` : ''}`

    items?.forEach((subject) => {
      subject?.items.forEach((question) => {
        const reportReadingCorrect = question?.reportReadingCorrect
        const questionA = question.options.find(
          (option) => option.option.toUpperCase() === 'A',
        )
        const questionB = question.options.find(
          (option) => option.option.toUpperCase() === 'B',
        )
        const questionC = question.options.find(
          (option) => option.option.toUpperCase() === 'C',
        )
        const questionD = question.options.find(
          (option) => option.option.toUpperCase() === 'D',
        )
        const questionNull = question.options.find(
          (option) => option.option === '-',
        )

        const formattedDataSubject = {
          base_consulta,
          disciplina: subject?.subject ?? '',
          questao: question.order + 1,
          questao_correta: question.option,
          A: `${questionA?.value}%`,
          B: `${questionB?.value}%`,
          C: `${questionC?.value}%`,
          D: `${questionD?.value}%`,
          '-': `${questionNull?.value}%`,
          fluente_acerto: `${reportReadingCorrect?.fluente}%`,
          nao_fluente_acerto: `${reportReadingCorrect?.nao_fluente}%`,
          frases_acerto: `${reportReadingCorrect?.frases}%`,
          palavras_acerto: `${reportReadingCorrect?.palavras}%`,
          silabas_acerto: `${reportReadingCorrect?.silabas}%`,
          nao_leitor_acerto: `${reportReadingCorrect?.nao_leitor}%`,
          nao_avaliado_acerto: `${reportReadingCorrect?.nao_avaliado}%`,
          nao_informado_acerto: `${reportReadingCorrect?.nao_informado}%`,
          descritor: question.descriptor,
        }
        data.push(formattedDataSubject)
      })
    })

    if (!items?.length) {
      data.push({})
    }

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
