export enum QuestionLevel {
  BASICO = 'BASICO',
  INTERMEDIARIO = 'INTERMEDIARIO',
  AVANCADO = 'AVANCADO',
}

export const QUESTION_LEVEL_LABELS: Record<QuestionLevel, string> = {
  [QuestionLevel.BASICO]: 'Básico',
  [QuestionLevel.INTERMEDIARIO]: 'Intermediário',
  [QuestionLevel.AVANCADO]: 'Avançado',
}

export const UNCLASSIFIED_LEVEL_LABEL = 'Não classificado'

export const QUESTION_LEVELS_ORDER = [
  QuestionLevel.BASICO,
  QuestionLevel.INTERMEDIARIO,
  QuestionLevel.AVANCADO,
]
