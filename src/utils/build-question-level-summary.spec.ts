import { QuestionLevel } from 'src/shared/enums/question-level.enum'

import {
  buildQuestionLevelSummary,
  QuestionLevelSummaryInput,
} from './build-question-level-summary'

const item = (
  overrides: Partial<QuestionLevelSummaryInput> = {},
): QuestionLevelSummaryInput => ({
  level: QuestionLevel.BASICO,
  annulled: false,
  totalCorrect: 0,
  totalAnswers: 0,
  ...overrides,
})

describe('buildQuestionLevelSummary', () => {
  it('always returns the three levels in a fixed order', () => {
    const { levelSummary } = buildQuestionLevelSummary([])

    expect(levelSummary.map((entry) => entry.level)).toEqual([
      QuestionLevel.BASICO,
      QuestionLevel.INTERMEDIARIO,
      QuestionLevel.AVANCADO,
    ])
    expect(levelSummary.map((entry) => entry.label)).toEqual([
      'Básico',
      'Intermediário',
      'Avançado',
    ])
  })

  it('computes a weighted percentage per level', () => {
    const { levelSummary, hasLevelClassification } = buildQuestionLevelSummary([
      item({ totalCorrect: 80, totalAnswers: 100 }),
      item({ totalCorrect: 40, totalAnswers: 100 }),
      item({
        level: QuestionLevel.AVANCADO,
        totalCorrect: 5,
        totalAnswers: 50,
      }),
    ])

    const [basico, intermediario, avancado] = levelSummary

    expect(basico).toMatchObject({
      totalItems: 2,
      totalCorrect: 120,
      totalAnswers: 200,
      value: 60,
    })
    expect(intermediario).toMatchObject({ totalItems: 0, value: null })
    expect(avancado).toMatchObject({ totalItems: 1, value: 10 })
    expect(hasLevelClassification).toBe(true)
  })

  it('matches the acceptance criteria of 6 basic items with 72% correct', () => {
    const items = Array.from({ length: 6 }, () =>
      item({ totalCorrect: 72, totalAnswers: 100 }),
    )

    const [basico] = buildQuestionLevelSummary(items).levelSummary

    expect(basico.totalItems).toBe(6)
    expect(basico.value).toBe(72)
  })

  it('returns 0 items and a null percentage for a level with no items', () => {
    const { levelSummary } = buildQuestionLevelSummary([
      item({ totalCorrect: 10, totalAnswers: 20 }),
    ])

    const avancado = levelSummary.find(
      (entry) => entry.level === QuestionLevel.AVANCADO,
    )

    expect(avancado.totalItems).toBe(0)
    expect(avancado.value).toBeNull()
  })

  it('groups items without a level into an "Não classificado" block', () => {
    const { levelSummary, hasLevelClassification } = buildQuestionLevelSummary([
      item({ totalCorrect: 50, totalAnswers: 100 }),
      item({ level: null, totalCorrect: 30, totalAnswers: 100 }),
      item({ level: undefined, totalCorrect: 10, totalAnswers: 100 }),
    ])

    expect(levelSummary).toHaveLength(4)

    const unclassified = levelSummary[3]

    expect(unclassified).toMatchObject({
      level: null,
      label: 'Não classificado',
      totalItems: 2,
      totalCorrect: 40,
      totalAnswers: 200,
      value: 20,
    })
    expect(hasLevelClassification).toBe(true)
  })

  it('omits the unclassified block when every item has a level', () => {
    const { levelSummary } = buildQuestionLevelSummary([
      item({ totalCorrect: 1, totalAnswers: 2 }),
    ])

    expect(levelSummary).toHaveLength(3)
  })

  it('flags a test where no item is classified', () => {
    const { levelSummary, hasLevelClassification } = buildQuestionLevelSummary([
      item({ level: null, totalCorrect: 5, totalAnswers: 10 }),
      item({ level: null, totalCorrect: 5, totalAnswers: 10 }),
    ])

    expect(hasLevelClassification).toBe(false)
    expect(
      levelSummary.slice(0, 3).every((entry) => entry.totalItems === 0),
    ).toBe(true)
    expect(levelSummary[3]).toMatchObject({ totalItems: 2, value: 50 })
  })

  it('excludes annulled items from both the count and the percentage', () => {
    const { levelSummary, annulledItemsExcluded } = buildQuestionLevelSummary([
      item({ totalCorrect: 80, totalAnswers: 100 }),
      item({ annulled: true, totalCorrect: 0, totalAnswers: 100 }),
    ])

    expect(annulledItemsExcluded).toBe(1)
    expect(levelSummary[0]).toMatchObject({
      totalItems: 1,
      totalCorrect: 80,
      totalAnswers: 100,
      value: 80,
    })
  })

  it('returns a null percentage when there are no answers at all', () => {
    const { levelSummary } = buildQuestionLevelSummary([
      item({ totalCorrect: 0, totalAnswers: 0 }),
    ])

    expect(levelSummary[0]).toMatchObject({ totalItems: 1, value: null })
  })

  it('coerces numeric strings coming from raw SQL rows', () => {
    const { levelSummary } = buildQuestionLevelSummary([
      item({
        totalCorrect: '30' as unknown as number,
        totalAnswers: '60' as unknown as number,
      }),
    ])

    expect(levelSummary[0]).toMatchObject({
      totalCorrect: 30,
      totalAnswers: 60,
      value: 50,
    })
  })

  it('tolerates a null item list', () => {
    const { levelSummary, hasLevelClassification } =
      buildQuestionLevelSummary(null)

    expect(levelSummary).toHaveLength(3)
    expect(hasLevelClassification).toBe(false)
  })
})
