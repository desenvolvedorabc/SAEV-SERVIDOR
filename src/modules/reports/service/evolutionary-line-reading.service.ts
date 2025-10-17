import { Injectable } from '@nestjs/common'
import { Parser } from 'json2csv'
import { PaginationParams } from 'src/helpers/params'
import { User } from 'src/modules/user/model/entities/user.entity'

import { EvolutionaryLineRepository } from '../repositories/evolutionary-line.repository'

@Injectable()
export class EvolutionaryLineReadingService {
  constructor(
    private readonly evolutionaryLineRepository: EvolutionaryLineRepository,
  ) {}

  async handle(paginationParams: PaginationParams, user: User) {
    const { reports } = await this.evolutionaryLineRepository.getDataReports(
      paginationParams,
      user,
      true,
    )

    const items = reports.map((reportEdition) => {
      const subject = reportEdition?.reportsSubjects[0]

      return {
        id: reportEdition.edition.AVA_ID,
        name: reportEdition.edition.AVA_NOME,
        subject,
      }
    })

    return { items }
  }

  async generateCsvForLineOfReading(
    paginationParams: PaginationParams,
    user: User,
  ) {
    const { items } = await this.handle(paginationParams, user)

    const data = []

    items?.forEach((item) => {
      const formattedDataSubject = {
        edicao: item.name,
        total_alunos: item.subject?.countTotalStudents,
        total_participantes: item.subject?.countPresentStudents,
        fluente: item.subject?.fluente,
        nao_fluente: item.subject?.nao_fluente,
        frases: item.subject?.frases,
        palavras: item.subject?.palavras,
        silabas: item.subject?.silabas,
        nao_leitor: item.subject?.nao_leitor,
        nao_avaliado: item.subject?.nao_avaliado,
        nao_informado: item.subject?.nao_informado,
      }
      data.push(formattedDataSubject)
    })

    const parser = new Parser({
      quote: ' ',
      withBOM: true,
      delimiter: ';',
    })

    try {
      const csv = parser.parse(data)
      return csv
    } catch (error) {
      console.log('error csv:', error.message)
    }
  }
}
