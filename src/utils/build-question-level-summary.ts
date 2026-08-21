import {
  QUESTION_LEVEL_LABELS,
  QUESTION_LEVELS_ORDER,
  QuestionLevel,
  UNCLASSIFIED_LEVEL_LABEL,
} from 'src/shared/enums/question-level.enum'

export interface QuestionLevelSummaryInput {
  level: QuestionLevel | null
  annulled: boolean
  totalCorrect: number
  totalAnswers: number
}

export interface QuestionLevelSummaryEntry {
  level: QuestionLevel | null
  label: string
  totalItems: number
  totalCorrect: number
  totalAnswers: number
  value: number | null
}

export interface QuestionLevelSummary {
  levelSummary: QuestionLevelSummaryEntry[]
  hasLevelClassification: boolean
  annulledItemsExcluded: number
}

function createEntry(level: QuestionLevel | null): QuestionLevelSummaryEntry {
  return {
    level,
    label: level ? QUESTION_LEVEL_LABELS[level] : UNCLASSIFIED_LEVEL_LABEL,
    totalItems: 0,
    totalCorrect: 0,
    totalAnswers: 0,
    value: null,
  }
}

/**
 * Agrega o acerto dos itens de um teste por nível de dificuldade (TEG_NIVEL).
 *
 * - percentual = média ponderada: soma dos acertos / soma das respostas do nível
 * - itens anulados (TEG_ANULADA) ficam fora do percentual e da contagem
 * - os três níveis vêm sempre presentes; "Não classificado" só quando houver itens
 */
export function buildQuestionLevelSummary(
  items: QuestionLevelSummaryInput[],
): QuestionLevelSummary {
  const entries = new Map<QuestionLevel | null, QuestionLevelSummaryEntry>(
    QUESTION_LEVELS_ORDER.map((level) => [level, createEntry(level)]),
  )
  const unclassified = createEntry(null)

  let annulledItemsExcluded = 0

  items?.forEach((item) => {
    if (item?.annulled) {
      annulledItemsExcluded += 1
      return
    }

    const entry = entries.get(item?.level ?? null) ?? unclassified

    entry.totalItems += 1
    entry.totalCorrect += Number(item?.totalCorrect) || 0
    entry.totalAnswers += Number(item?.totalAnswers) || 0
  })

  const levelSummary = [...entries.values()]

  if (unclassified.totalItems > 0) {
    levelSummary.push(unclassified)
  }

  levelSummary.forEach((entry) => {
    entry.value =
      entry.totalAnswers > 0
        ? Math.round((entry.totalCorrect / entry.totalAnswers) * 100)
        : null
  })

  const hasLevelClassification = QUESTION_LEVELS_ORDER.some(
    (level) => entries.get(level).totalItems > 0,
  )

  return {
    levelSummary,
    hasLevelClassification,
    annulledItemsExcluded,
  }
}
