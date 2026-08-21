import { Test, TestingModule } from '@nestjs/testing'
import { getConnectionToken } from '@nestjs/typeorm'
import { PaginationParams } from 'src/helpers/params'
import { User } from 'src/modules/user/model/entities/user.entity'
import { QuestionLevel } from 'src/shared/enums/question-level.enum'

import { ReportSyntheticRepository } from '../repositories/synthetic.repository'
import { EvolutionaryLineReadingService } from './evolutionary-line-reading.service'
import { ReportSyntheticService } from './synthetic.service'

const reportQuestion = ({
  id,
  order,
  level,
  annulled = false,
  correctOption = 'A',
  totals = {
    total_a: 60,
    total_b: 20,
    total_c: 10,
    total_d: 10,
    total_null: 0,
  },
}: {
  id: number
  order: number
  level: QuestionLevel | null
  annulled?: boolean
  correctOption?: string
  totals?: Record<string, number>
}) => ({
  option_correct: correctOption,
  ...totals,
  fluente: 0,
  nao_fluente: 0,
  silabas: 0,
  frases: 0,
  palavras: 0,
  nao_leitor: 0,
  nao_avaliado: 0,
  nao_informado: 0,
  question: {
    TEG_ID: id,
    TEG_ORDEM: order,
    TEG_ANULADA: annulled,
    TEG_NIVEL: level,
    TEG_MTI: { MTI_DESCRITOR: `D${order}` },
  },
})

const buildReport = (reportQuestions: unknown[]) => ({
  report: {
    reportsSubjects: [
      {
        id: 1,
        test: {
          TES_ID: 10,
          TES_DIS: { DIS_ID: 1, DIS_NOME: 'Português', DIS_TIPO: 'OBJETIVA' },
        },
        reportQuestions,
      },
    ],
  },
})

describe('ReportSyntheticService', () => {
  let service: ReportSyntheticService
  let repository: { getDataReports: jest.Mock }

  const user = { USU_SPE: { role: 'SAEV' } } as unknown as User
  const params = {} as PaginationParams

  beforeEach(async () => {
    repository = { getDataReports: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportSyntheticService,
        { provide: ReportSyntheticRepository, useValue: repository },
        {
          provide: EvolutionaryLineReadingService,
          useValue: { handle: jest.fn().mockResolvedValue({ items: [] }) },
        },
        {
          provide: getConnectionToken(),
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              findOne: jest.fn().mockResolvedValue(undefined),
            }),
          },
        },
      ],
    }).compile()

    service = module.get<ReportSyntheticService>(ReportSyntheticService)
  })

  it('exposes the difficulty level of each item', async () => {
    repository.getDataReports.mockResolvedValue(
      buildReport([
        reportQuestion({ id: 1, order: 0, level: QuestionLevel.BASICO }),
        reportQuestion({
          id: 2,
          order: 1,
          level: QuestionLevel.INTERMEDIARIO,
        }),
        reportQuestion({ id: 3, order: 2, level: null }),
      ]),
    )

    const { items } = await service.handle(params, user)

    expect(items[0].items.map((item) => item.level)).toEqual([
      QuestionLevel.BASICO,
      QuestionLevel.INTERMEDIARIO,
      null,
    ])
  })

  it('aggregates the hit rate per level with the three fixed blocks', async () => {
    repository.getDataReports.mockResolvedValue(
      buildReport([
        reportQuestion({
          id: 1,
          order: 0,
          level: QuestionLevel.BASICO,
          totals: {
            total_a: 80,
            total_b: 10,
            total_c: 5,
            total_d: 5,
            total_null: 0,
          },
        }),
        reportQuestion({
          id: 2,
          order: 1,
          level: QuestionLevel.BASICO,
          totals: {
            total_a: 40,
            total_b: 30,
            total_c: 20,
            total_d: 10,
            total_null: 0,
          },
        }),
      ]),
    )

    const { items } = await service.handle(params, user)
    const [subject] = items

    expect(subject.hasLevelClassification).toBe(true)
    expect(subject.levelSummary).toHaveLength(3)
    expect(subject.levelSummary[0]).toMatchObject({
      level: QuestionLevel.BASICO,
      label: 'Básico',
      totalItems: 2,
      value: 60,
    })
    expect(subject.levelSummary[2]).toMatchObject({
      level: QuestionLevel.AVANCADO,
      totalItems: 0,
      value: null,
    })
  })

  it('excludes annulled items from the aggregate', async () => {
    repository.getDataReports.mockResolvedValue(
      buildReport([
        reportQuestion({ id: 1, order: 0, level: QuestionLevel.BASICO }),
        reportQuestion({
          id: 2,
          order: 1,
          level: QuestionLevel.BASICO,
          annulled: true,
        }),
      ]),
    )

    const { items } = await service.handle(params, user)

    expect(items[0].annulledItemsExcluded).toBe(1)
    expect(items[0].levelSummary[0]).toMatchObject({
      totalItems: 1,
      value: 60,
    })
  })

  it('loads a test created before the level marking without failing', async () => {
    repository.getDataReports.mockResolvedValue(
      buildReport([
        reportQuestion({ id: 1, order: 0, level: null }),
        reportQuestion({ id: 2, order: 1, level: null }),
      ]),
    )

    const { items } = await service.handle(params, user)
    const [subject] = items

    expect(subject.hasLevelClassification).toBe(false)
    expect(subject.levelSummary).toHaveLength(4)
    expect(subject.levelSummary[3]).toMatchObject({
      level: null,
      label: 'Não classificado',
      totalItems: 2,
    })
  })

  it('writes the level column between questao and questao_correta in the csv', async () => {
    repository.getDataReports.mockResolvedValue(
      buildReport([
        reportQuestion({
          id: 1,
          order: 0,
          level: QuestionLevel.INTERMEDIARIO,
        }),
        reportQuestion({ id: 2, order: 1, level: null }),
      ]),
    )

    const csv = await service.generateCsv(params, user)
    const [header, firstRow, secondRow] = csv.split('\n')

    expect(header.replace('﻿', '').split(',').slice(0, 5)).toEqual([
      '"base_consulta"',
      '"disciplina"',
      '"questao"',
      '"nivel"',
      '"questao_correta"',
    ])
    expect(firstRow).toContain('"Intermediário"')
    expect(secondRow).toContain('"Não classificado"')
  })

  it('quotes values so commas and spaces do not break the csv columns', async () => {
    const withComma = reportQuestion({
      id: 1,
      order: 0,
      level: QuestionLevel.BASICO,
    })
    withComma.question.TEG_MTI.MTI_DESCRITOR =
      'Comparar ou ordenar o objeto/pessoa/animal, por meio de medidas'

    repository.getDataReports.mockResolvedValue(buildReport([withComma]))

    const csv = await service.generateCsv(params, user)
    const [header, row] = csv.split('\n')

    // o descritor com vírgula fica em um único campo entre aspas
    expect(row).toContain(
      '"Comparar ou ordenar o objeto/pessoa/animal, por meio de medidas"',
    )
    // espaços internos preservados (o antigo quote: ' ' os duplicava)
    expect(row).not.toContain('  ')
    expect(header.split('","')).toHaveLength(19)
  })

  it('keeps the csv header when there are no results', async () => {
    repository.getDataReports.mockResolvedValue({
      report: { reportsSubjects: [] },
    })

    const csv = await service.generateCsv(params, user)

    expect(csv.replace('﻿', '').split('\n')[0]).toContain('"nivel"')
  })
})
