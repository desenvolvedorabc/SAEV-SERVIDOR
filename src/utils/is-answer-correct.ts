import { StudentTestAnswer } from 'src/modules/release-results/model/entities/student-test-answer.entity'

export function isAnswerCorrect(answer: StudentTestAnswer): boolean {
  if (
    !answer?.ATR_RESPOSTA ||
    !answer?.questionTemplate?.TEG_RESPOSTA_CORRETA
  ) {
    return false
  }

  return (
    answer.ATR_RESPOSTA.toUpperCase() ===
    answer.questionTemplate.TEG_RESPOSTA_CORRETA.toUpperCase()
  )
}
