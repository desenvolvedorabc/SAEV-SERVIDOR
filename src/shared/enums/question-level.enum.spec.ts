import { QuestionLevel } from './question-level.enum'

describe('QuestionLevel', () => {
  it('has exactly three values', () => {
    expect(Object.values(QuestionLevel)).toHaveLength(3)
  })

  it('has BASICO value', () => {
    expect(QuestionLevel.BASICO).toBe('BASICO')
  })

  it('has INTERMEDIARIO value', () => {
    expect(QuestionLevel.INTERMEDIARIO).toBe('INTERMEDIARIO')
  })

  it('has AVANCADO value', () => {
    expect(QuestionLevel.AVANCADO).toBe('AVANCADO')
  })
})
