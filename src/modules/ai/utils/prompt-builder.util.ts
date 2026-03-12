import {
  ReportContext,
  ReportItem,
  ReportSubItem,
} from '../model/interface/report-context.interface'
import { sanitizeReportContext } from './sanitize.util'

const LEVEL_LABELS: Record<string, string> = {
  regional: 'Regionais do Estado',
  county: 'Municípios',
  regionalSchool: 'Regionais do Município',
  school: 'Escolas',
  schoolClass: 'Turmas',
}

const LEVEL_SINGULAR_LABELS: Record<string, string> = {
  regional: 'Regional do Estado',
  county: 'Município',
  regionalSchool: 'Regional do Município',
  school: 'Escola',
  schoolClass: 'Turma',
}

const LEVEL_PARENT_CONTEXT: Record<string, string> = {
  regional: 'do Estado',
  county: 'da Regional do Estado',
  regionalSchool: 'do Município',
  school: 'da Regional do Município',
  schoolClass: 'da Escola',
}

const READING_LEVEL_LABELS: Record<string, string> = {
  fluente: 'Fluente',
  nao_fluente: 'Não Fluente',
  frases: 'Lê Frases',
  palavras: 'Lê Palavras',
  silabas: 'Lê Sílabas',
  nao_leitor: 'Não Leitor',
  nao_avaliado: 'Não Avaliado',
  nao_informado: 'Não Informado',
}

const READING_LEVEL_DESCRIPTIONS: Record<string, string> = {
  fluente:
    'Aluno com leitura fluida, boa entonação e compreensão textual adequada.',
  nao_fluente:
    'Aluno que lê, porém com dificuldades na fluência e/ou compreensão.',
  frases: 'Aluno capaz de ler frases simples, mas ainda não textos completos.',
  palavras: 'Aluno em fase de decodificação, lendo palavras isoladas.',
  silabas: 'Aluno que reconhece e lê sílabas, mas não palavras completas.',
  nao_leitor: 'Aluno ainda não alfabetizado, sem capacidade de leitura.',
  nao_avaliado: 'Aluno não avaliado devido a algum motivo justo.',
  nao_informado:
    'Aluno sem registro de avaliação de leitura e registro de motivo da não avaliação.',
}

function formatContextHeader(context: ReportContext): string {
  const lines: string[] = ['=== DADOS DO RELATÓRIO DE SÍNTESE GERAL ===\n']

  if (context.serie?.SER_NOME) {
    lines.push(`SÉRIE: ${context.serie.SER_NOME}`)
  }

  if (context.year?.name) {
    lines.push(`ANO LETIVO: ${context.year.name}`)
  }

  if (context.edition?.name) {
    lines.push(`EDIÇÃO DA AVALIAÇÃO: ${context.edition.name}`)
  }

  return lines.join('\n')
}

function formatBreadcrumb(context: ReportContext): string {
  if (!context.breadcrumb?.length) return ''

  const lines: string[] = ['\nFILTROS APLICADOS:']
  context.breadcrumb.forEach((item) => {
    if (item.name) {
      lines.push(`  - ${item.label}: ${item.name}`)
    }
  })

  return lines.join('\n')
}

function formatLocationInfo(context: ReportContext): string {
  const lines: string[] = []

  if (context.state?.name) lines.push(`\nESTADO: ${context.state.name}`)
  if (context.stateRegional?.name)
    lines.push(`REGIONAL DO ESTADO: ${context.stateRegional.name}`)
  if (context.county?.name) lines.push(`MUNICÍPIO: ${context.county.name}`)
  if (context.countyRegional?.name)
    lines.push(`REGIONAL DO MUNICÍPIO: ${context.countyRegional.name}`)
  if (context.school?.name) lines.push(`ESCOLA: ${context.school.name}`)
  if (context.schoolClass?.name)
    lines.push(`TURMA: ${context.schoolClass.name}`)

  return lines.join('\n')
}

function calculateStudentStats(
  students: NonNullable<ReportItem['students']>,
): string {
  const averages = students
    .map((s) => s.avg)
    .filter((a): a is number => a !== null && a !== undefined && !isNaN(a))

  if (averages.length === 0) return ''

  const avgAvg = averages.reduce((a, b) => a + b, 0) / averages.length
  const maxAvg = Math.max(...averages)
  const minAvg = Math.min(...averages)

  const faixas = {
    menorDesempenho: averages.filter((a) => a >= 0 && a <= 24).length,
    abaixoMedia: averages.filter((a) => a >= 25 && a <= 49).length,
    mediano: averages.filter((a) => a >= 50 && a <= 74).length,
    maiorDesempenho: averages.filter((a) => a >= 75 && a <= 100).length,
  }

  const total = averages.length
  const lines: string[] = [
    `\nEstatísticas de desempenho:`,
    `  - Média geral: ${avgAvg.toFixed(1)}%`,
    `  - Maior nota: ${maxAvg.toFixed(1)}%`,
    `  - Menor nota: ${minAvg.toFixed(1)}%`,
    `\nDistribuição por nível de desempenho:`,
    `  - Maior Desempenho (75-100%): ${faixas.maiorDesempenho} alunos (${((faixas.maiorDesempenho / total) * 100).toFixed(1)}%)`,
    `  - Desempenho Mediano (50-74%): ${faixas.mediano} alunos (${((faixas.mediano / total) * 100).toFixed(1)}%)`,
    `  - Abaixo da Média (25-49%): ${faixas.abaixoMedia} alunos (${((faixas.abaixoMedia / total) * 100).toFixed(1)}%)`,
    `  - Menor Desempenho (0-24%): ${faixas.menorDesempenho} alunos (${((faixas.menorDesempenho / total) * 100).toFixed(1)}%)`,
  ]

  return lines.join('\n')
}

function formatStudentRanking(
  students: NonNullable<ReportItem['students']>,
): string {
  const sortedStudents = [...students]
    .filter((s) => s.avg !== null && s.avg !== undefined)
    .sort((a, b) => (b.avg || 0) - (a.avg || 0))

  if (sortedStudents.length === 0) return ''

  const lines: string[] = ['\nMelhores desempenhos:']
  sortedStudents.slice(0, 5).forEach((student, i) => {
    lines.push(
      `  ${i + 1}. ${student.name}: ${student.avg?.toFixed(1) || 'N/A'}%`,
    )
  })

  lines.push('\nAlunos que necessitam atenção prioritária:')
  sortedStudents
    .slice(-5)
    .reverse()
    .forEach((student, i) => {
      lines.push(
        `  ${i + 1}. ${student.name}: ${student.avg?.toFixed(1) || 'N/A'}%`,
      )
    })

  return lines.join('\n')
}

function formatAllStudentsComplete(
  item: ReportItem,
  questionIdToNumber: Record<number, number>,
): string {
  if (!item.students?.length) return ''

  const isReadingSubject =
    item.typeSubject?.toLowerCase() === 'leitura' ||
    item.subject?.toLowerCase().includes('leitura')

  const sortedStudents = [...item.students].sort((a, b) => {
    if (isReadingSubject) {
      // Para leitura, ordena alfabeticamente
      return (a.name || '').localeCompare(b.name || '')
    }
    // Para disciplinas objetivas, ordena por média (maior para menor)
    return (b.avg || 0) - (a.avg || 0)
  })

  const lines: string[] = [
    `\n=== LISTAGEM COMPLETA DE TODOS OS ALUNOS (${item.students.length} alunos) ===`,
    `[Use esta lista para responder perguntas sobre qualquer aluno específico]\n`,
  ]

  sortedStudents.forEach((student, index) => {
    const position = index + 1

    if (isReadingSubject) {
      // Formato para disciplina de leitura
      // Em leitura, NÃO existe array de quests - apenas o campo 'type' com o nível
      const readingLevel = student.type || 'Não Informado'
      const levelLabel = READING_LEVEL_LABELS[readingLevel] || readingLevel
      lines.push(`${position}. ${student.name}`)
      lines.push(`   Nível de Leitura: ${levelLabel}`)
    } else {
      // Formato para disciplinas objetivas
      const avgDisplay =
        student.avg !== null && student.avg !== undefined
          ? `${student.avg.toFixed(1)}%`
          : 'N/A'

      lines.push(`${position}. ${student.name} - Média: ${avgDisplay}`)

      // APENAS em disciplinas objetivas: verifica se o aluno fez a prova
      // Em Leitura, o array quests NÃO existe, então essa validação não se aplica
      if (!student.quests || student.quests.length === 0) {
        lines.push(`   Status: AUSENTE (não fez a prova)`)
      } else {
        // Adiciona respostas por questão
        const questionsAnswered: string[] = []

        student.quests.forEach((quest) => {
          const questionNum =
            questionIdToNumber[quest.questionId] || quest.questionId

          // Verifica se não respondeu a questão (letter = "-")
          if (quest.letter === '-' || !quest.letter) {
            questionsAnswered.push(`Q${questionNum}:-`)
          } else {
            const isCorrect = quest.type === 'right' ? '✓' : '✗'
            questionsAnswered.push(
              `Q${questionNum}:${quest.letter}${isCorrect}`,
            )
          }
        })

        if (questionsAnswered.length > 0) {
          lines.push(`   Respostas: ${questionsAnswered.join(' | ')}`)
        }
      }
    }

    lines.push('') // Linha em branco entre alunos para melhor legibilidade
  })

  return lines.join('\n')
}

function formatReadingLevels(item: ReportItem): string {
  if (!item.dataGraph) return ''

  const lines: string[] = ['\nDistribuição por nível de leitura:']

  const readingData = item.dataGraph
  const total = Object.values(readingData).reduce((sum, val) => sum + val, 0)

  if (total === 0) return ''

  const orderedLevels = [
    'fluente',
    'nao_fluente',
    'frases',
    'palavras',
    'silabas',
    'nao_leitor',
    'nao_avaliado',
    'nao_informado',
  ]

  orderedLevels.forEach((level) => {
    const count = readingData[level as keyof typeof readingData] || 0
    if (count > 0) {
      const percentage = ((count / total) * 100).toFixed(1)
      lines.push(
        `  - ${READING_LEVEL_LABELS[level]}: ${count} alunos (${percentage}%)`,
      )
    }
  })

  return lines.join('\n')
}

function formatDescriptors(item: ReportItem): string {
  if (item.students?.length && !item.quests?.descriptors?.length) {
    return '\n[Dados de questões/descritores não disponíveis para esta disciplina]'
  }

  if (!item.quests?.descriptors?.length) return ''

  const lines: string[] = [
    `\nQUESTÕES E DESCRITORES (${item.quests.total || item.quests.descriptors.length} questões):`,
  ]

  const sortedDescriptors = [...item.quests.descriptors].sort(
    (a, b) => (a.TEG_ORDEM || 0) - (b.TEG_ORDEM || 0),
  )

  sortedDescriptors.forEach((descriptor) => {
    const questionNumber =
      descriptor.TEG_ORDEM !== undefined
        ? descriptor.TEG_ORDEM + 1
        : descriptor.id
    const code = descriptor.cod || ''
    const description = descriptor.description || ''
    lines.push(`  Questão ${questionNumber}: [${code}] ${description}`)
  })

  return lines.join('\n')
}

function formatStudentAnswersByQuestion(item: ReportItem): string {
  if (!item.students?.length || !item.quests?.descriptors?.length) return ''

  const allQuests = item.students.flatMap((s) => s.quests || [])
  if (allQuests.length === 0) return ''

  const questionIdToNumber: Record<number, number> = {}
  item.quests.descriptors.forEach((descriptor) => {
    const questionNumber =
      descriptor.TEG_ORDEM !== undefined
        ? descriptor.TEG_ORDEM + 1
        : descriptor.id
    questionIdToNumber[descriptor.id] = questionNumber
  })

  const answersByQuestion: Record<
    number,
    { total: number; byLetter: Record<string, number>; correct: number }
  > = {}

  allQuests.forEach((quest) => {
    const questionNum = questionIdToNumber[quest.questionId] || quest.questionId
    if (!answersByQuestion[questionNum]) {
      answersByQuestion[questionNum] = { total: 0, byLetter: {}, correct: 0 }
    }
    answersByQuestion[questionNum].total++
    answersByQuestion[questionNum].byLetter[quest.letter] =
      (answersByQuestion[questionNum].byLetter[quest.letter] || 0) + 1
    if (quest.type === 'right') {
      answersByQuestion[questionNum].correct++
    }
  })

  const lines: string[] = ['\nRESPOSTAS POR QUESTÃO:']

  const questionNumbers = Object.keys(answersByQuestion)
    .map(Number)
    .sort((a, b) => a - b)

  questionNumbers.forEach((questionNum) => {
    const data = answersByQuestion[questionNum]
    const correctPercent = ((data.correct / data.total) * 100).toFixed(1)

    const letterDistribution = Object.entries(data.byLetter)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([letter, count]) => `${letter}:${count}`)
      .join(' | ')

    lines.push(
      `  Questão ${questionNum}: ${correctPercent}% acertos (${data.correct}/${data.total}) - Respostas: ${letterDistribution}`,
    )
  })

  return lines.join('\n')
}

function formatDescriptorIndex(item: ReportItem): string {
  if (!item.quests?.descriptors?.length) return ''

  // Agrupa questões por código de descritor
  const descriptorMap: Record<
    string,
    { description: string; questions: number[] }
  > = {}

  const sortedDescriptors = [...item.quests.descriptors].sort(
    (a, b) => (a.TEG_ORDEM || 0) - (b.TEG_ORDEM || 0),
  )

  sortedDescriptors.forEach((descriptor) => {
    const questionNumber =
      descriptor.TEG_ORDEM !== undefined
        ? descriptor.TEG_ORDEM + 1
        : descriptor.id
    const code = descriptor.cod || 'SEM_CÓDIGO'
    const description = descriptor.description || ''

    if (!descriptorMap[code]) {
      descriptorMap[code] = { description, questions: [] }
    }
    descriptorMap[code].questions.push(questionNumber)
  })

  const lines: string[] = [
    '\nÍNDICE DE DESCRITORES:',
    '[Use esta lista para localizar rapidamente quais questões pertencem a cada descritor]',
  ]

  Object.entries(descriptorMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([code, data]) => {
      const questionsStr = data.questions.join(', ')
      lines.push(`  ${code}: Questões ${questionsStr}`)
      lines.push(`    ${data.description}`)
    })

  return lines.join('\n')
}

function formatSubItemReadingData(subItem: ReportSubItem): string {
  const readingFields = [
    'fluente',
    'nao_fluente',
    'frases',
    'palavras',
    'silabas',
    'nao_leitor',
  ] as const

  const hasReadingData = readingFields.some(
    (field) => subItem[field] !== undefined && subItem[field] !== 0,
  )

  if (!hasReadingData) return ''

  const parts: string[] = []
  readingFields.forEach((field) => {
    const value = subItem[field]
    if (value !== undefined && value > 0) {
      parts.push(`${READING_LEVEL_LABELS[field]}: ${value}`)
    }
  })

  return parts.length > 0 ? ` | Leitura: ${parts.join(', ')}` : ''
}

function formatSubItemReadingDistribution(subItem: ReportSubItem): string {
  const readingFields = [
    { key: 'fluente', label: 'Fluente' },
    { key: 'nao_fluente', label: 'Não Fluente' },
    { key: 'frases', label: 'Frases' },
    { key: 'palavras', label: 'Palavras' },
    { key: 'silabas', label: 'Sílabas' },
    { key: 'nao_leitor', label: 'Não Leitor' },
    { key: 'nao_avaliado', label: 'Não Avaliado' },
    { key: 'nao_informado', label: 'Não Informado' },
  ] as const

  const parts: string[] = []
  readingFields.forEach(({ key, label }) => {
    const value = subItem[key as keyof ReportSubItem] as number | undefined
    if (value !== undefined) {
      parts.push(`${label}: ${value}`)
    }
  })

  return parts.join(', ')
}

function calculateReadingTotals(
  items: ReportSubItem[],
): Record<string, number> {
  const totals: Record<string, number> = {
    fluente: 0,
    nao_fluente: 0,
    frases: 0,
    palavras: 0,
    silabas: 0,
    nao_leitor: 0,
    nao_avaliado: 0,
    nao_informado: 0,
  }

  items.forEach((item) => {
    Object.keys(totals).forEach((key) => {
      const value = item[key as keyof ReportSubItem] as number | undefined
      if (value !== undefined) {
        totals[key] += value
      }
    })
  })

  return totals
}

function formatSubItems(
  items: ReportSubItem[],
  level: string,
  isReading = false,
): string {
  if (!items?.length) return ''

  const levelLabel = LEVEL_LABELS[level] || level
  const singularLabel = LEVEL_SINGULAR_LABELS[level] || level
  const parentContext = LEVEL_PARENT_CONTEXT[level] || ''

  const hasReadingFields = isReading

  const lines: string[] = [
    `\n📊 LISTAGEM DE ${levelLabel.toUpperCase()} ${parentContext.toUpperCase()} (${items.length} ${items.length === 1 ? singularLabel.toLowerCase() : levelLabel.toLowerCase()}):`,
    `   [Estes são os dados que você pode comparar entre si]`,
  ]

  if (hasReadingFields) {
    const sortedItems = [...items].sort((a, b) => {
      const aFluente = (a.fluente || 0) + (a.nao_fluente || 0)
      const bFluente = (b.fluente || 0) + (b.nao_fluente || 0)
      return bFluente - aFluente
    })

    sortedItems.forEach((subItem, i) => {
      const position = i + 1
      const readingDistribution = formatSubItemReadingDistribution(subItem)
      const participationInfo =
        subItem.countPresentStudents !== undefined &&
        subItem.countTotalStudents !== undefined
          ? ` | Avaliados: ${subItem.countPresentStudents}/${subItem.countTotalStudents}`
          : ''

      // Adiciona marcador visual mais claro
      lines.push(`\n   ▸ [#${position}] ${subItem.name}${participationInfo}`)
      if (readingDistribution) {
        lines.push(`     Leitura: ${readingDistribution}`)
      }
    })

    if (items.length >= 2) {
      const totals = calculateReadingTotals(items)
      const totalStudents = Object.values(totals).reduce(
        (sum, val) => sum + val,
        0,
      )

      if (totalStudents > 0) {
        lines.push(
          `\n   Resumo comparativo de leitura (total de ${totalStudents} alunos):`,
        )

        const readingLabels = [
          { key: 'fluente', label: 'Fluente' },
          { key: 'nao_fluente', label: 'Não Fluente' },
          { key: 'frases', label: 'Lê Frases' },
          { key: 'palavras', label: 'Lê Palavras' },
          { key: 'silabas', label: 'Lê Sílabas' },
          { key: 'nao_leitor', label: 'Não Leitor' },
          { key: 'nao_avaliado', label: 'Não Avaliado' },
          { key: 'nao_informado', label: 'Não Informado' },
        ]

        readingLabels.forEach(({ key, label }) => {
          const percentage = ((totals[key] / totalStudents) * 100).toFixed(1)
          lines.push(`   - ${label}: ${totals[key]} alunos (${percentage}%)`)
        })

        const fluentRanking = [...items]
          .filter((i) => i.fluente !== undefined && i.fluente > 0)
          .sort((a, b) => (b.fluente || 0) - (a.fluente || 0))
          .slice(0, 3)

        if (fluentRanking.length > 0) {
          lines.push(`\n   ${levelLabel} com mais alunos fluentes:`)
          fluentRanking.forEach((item, i) => {
            lines.push(`   ${i + 1}. ${item.name}: ${item.fluente} fluentes`)
          })
        }

        const needsAttention = [...items]
          .filter((i) => i.nao_leitor !== undefined && i.nao_leitor > 0)
          .sort((a, b) => (b.nao_leitor || 0) - (a.nao_leitor || 0))
          .slice(0, 3)

        if (needsAttention.length > 0) {
          lines.push(
            `\n   ${levelLabel} que necessitam atenção prioritária (mais não leitores):`,
          )
          needsAttention.forEach((item, i) => {
            lines.push(
              `   ${i + 1}. ${item.name}: ${item.nao_leitor} não leitores`,
            )
          })
        }
      }
    }
  } else {
    const getAverage = (item: ReportSubItem): number => {
      if (
        item.totalGradesStudents !== undefined &&
        item.countPresentStudents !== undefined &&
        item.countPresentStudents > 0
      ) {
        return item.totalGradesStudents / item.countPresentStudents
      }
      return item.value || 0
    }

    const sortedItems = [...items].sort((a, b) => getAverage(b) - getAverage(a))

    sortedItems.forEach((subItem, i) => {
      const position = i + 1
      const readingInfo = formatSubItemReadingData(subItem)
      const participationInfo =
        subItem.countPresentStudents !== undefined &&
        subItem.countTotalStudents !== undefined
          ? ` | Avaliados: ${subItem.countPresentStudents}/${subItem.countTotalStudents}`
          : ''

      const avg = getAverage(subItem)
      const valueDisplay = `${avg.toFixed(1)}%`

      // Adiciona marcador visual mais claro
      lines.push(
        `\n   ▸ [#${position}] ${subItem.name}: ${valueDisplay}${participationInfo}${readingInfo}`,
      )
    })

    if (items.length >= 3) {
      const values = sortedItems.map((i) => getAverage(i))
      const avg = values.reduce((a, b) => a + b, 0) / values.length
      const max = Math.max(...values)
      const min = Math.min(...values)
      const topItem = sortedItems[0]
      const bottomItem = sortedItems[sortedItems.length - 1]

      lines.push(`\n   Resumo comparativo das ${levelLabel.toLowerCase()}:`)
      lines.push(
        `   - Média entre ${levelLabel.toLowerCase()}: ${avg.toFixed(1)}%`,
      )
      lines.push(`   - Maior desempenho: ${topItem.name} (${max}%)`)
      lines.push(`   - Menor desempenho: ${bottomItem.name} (${min}%)`)
      lines.push(`   - Amplitude: ${(max - min).toFixed(1)} pontos percentuais`)
    }
  }

  return lines.join('\n')
}

function formatReportItem(item: ReportItem): string {
  const lines: string[] = [`\n--- ${item.subject.toUpperCase()} ---`]

  const isReadingSubject =
    item.typeSubject?.toLowerCase() === 'leitura' ||
    item.subject?.toLowerCase().includes('leitura')

  if (!isReadingSubject) {
    if (item.avg !== undefined && item.avg !== null) {
      lines.push(`Média geral do filtro atual: ${Number(item.avg).toFixed(1)}%`)
    }

    if (item.min !== undefined && item.max !== undefined) {
      lines.push(`Amplitude: Mín ${item.min}% | Máx ${item.max}%`)
    }
  } else {
    lines.push(
      `[Dados de Leitura - avaliação por níveis de fluência, não há média numérica]`,
    )
  }

  if (item.level && item.items?.length) {
    const levelLabel = LEVEL_LABELS[item.level] || item.level
    const parentContext = LEVEL_PARENT_CONTEXT[item.level] || ''

    if (isReadingSubject) {
      lines.push(
        `\n⚡ CONTEXTO HIERÁRQUICO: Você está vendo a distribuição de leitura ${parentContext} e a listagem de ${levelLabel.toLowerCase()} abaixo.`,
      )
      lines.push(
        `   Perguntas como "compare a leitura das ${levelLabel.toLowerCase()}" ou "qual ${LEVEL_SINGULAR_LABELS[item.level]?.toLowerCase() || item.level} tem mais alunos fluentes" podem ser respondidas com estes dados.`,
      )
    } else {
      lines.push(
        `\n⚡ CONTEXTO HIERÁRQUICO: Você está vendo o valor total ${parentContext} e a listagem de ${levelLabel.toLowerCase()} abaixo.`,
      )
      lines.push(
        `   Perguntas como "compare as ${levelLabel.toLowerCase()}" ou "qual ${LEVEL_SINGULAR_LABELS[item.level]?.toLowerCase() || item.level} tem melhor desempenho" podem ser respondidas com estes dados.`,
      )
    }
    lines.push(formatSubItems(item.items, item.level, isReadingSubject))
  }

  // Cria mapeamento de questionId para número de questão
  const questionIdToNumber: Record<number, number> = {}
  if (item.quests?.descriptors?.length) {
    item.quests.descriptors.forEach((descriptor) => {
      const questionNumber =
        descriptor.TEG_ORDEM !== undefined
          ? descriptor.TEG_ORDEM + 1
          : descriptor.id
      questionIdToNumber[descriptor.id] = questionNumber
    })
  }

  if (item.students?.length) {
    lines.push(`\nTotal de alunos: ${item.students.length}`)
    lines.push(calculateStudentStats(item.students))
    lines.push(formatStudentRanking(item.students))

    if (isReadingSubject) {
      const readingStats = item.students.reduce(
        (acc, student) => {
          const tipo = student.type || 'nao_informado'
          acc[tipo] = (acc[tipo] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      lines.push('\nDistribuição por nível de leitura (por aluno):')
      Object.entries(readingStats).forEach(([nivel, count]) => {
        const label = READING_LEVEL_LABELS[nivel] || nivel
        lines.push(`  - ${label}: ${count} alunos`)
      })
    }

    // Adiciona listagem completa de todos os alunos
    lines.push(formatAllStudentsComplete(item, questionIdToNumber))
  }

  lines.push(formatReadingLevels(item))
  lines.push(formatDescriptors(item))
  lines.push(formatDescriptorIndex(item))
  lines.push(formatStudentAnswersByQuestion(item))

  return lines.join('\n')
}

function formatItems(context: ReportContext): string {
  if (!context.items?.length) return ''

  const lines: string[] = ['\n=== RESULTADOS POR DISCIPLINA ===']

  context.items.forEach((item) => {
    lines.push(formatReportItem(item))
  })

  return lines.join('\n')
}

function buildReadingLevelReference(): string {
  const lines: string[] = ['\n=== REFERÊNCIA: NÍVEIS DE LEITURA ===']

  Object.entries(READING_LEVEL_DESCRIPTIONS).forEach(([key, description]) => {
    lines.push(`- ${READING_LEVEL_LABELS[key]}: ${description}`)
  })

  return lines.join('\n')
}

function buildProficiencyLevelReference(): string {
  return `
=== REFERÊNCIA: NÍVEIS DE DESEMPENHO ===
- Maior Desempenho (75-100%): Domínio satisfatório ou pleno das habilidades avaliadas.
- Desempenho Mediano (50-74%): Domínio parcial das habilidades avaliadas.
- Abaixo da Média (25-49%): Domínio insuficiente das habilidades avaliadas.
- Menor Desempenho (0-24%): Lacunas significativas nas habilidades avaliadas.`
}

function buildHierarchyReference(): string {
  return `
=== REFERÊNCIA: HIERARQUIA DOS DADOS ===
Os dados são organizados em níveis hierárquicos. O filtro atual determina qual nível você está visualizando:
- Estado → lista Regionais do Estado (level: regional)
- Regional do Estado → lista Municípios (level: county)
- Município → lista Regionais do Município (level: regionalSchool)
- Regional do Município → lista Escolas (level: school)
- Escola → lista Turmas (level: schoolClass)
- Turma → lista Alunos

Quando o usuário perguntar sobre comparações (ex: "compare as regionais", "qual escola tem melhor desempenho"),
use os dados da LISTAGEM correspondente ao nível atual.`
}

export function formatContextForPrompt(
  contextData: ReportContext | undefined,
): string {
  if (!contextData) return 'Nenhum dado de relatório disponível para análise.'

  const sanitizedContext = sanitizeReportContext(contextData)

  const sections: string[] = [
    formatContextHeader(sanitizedContext),
    formatBreadcrumb(sanitizedContext),
    formatLocationInfo(sanitizedContext),
    formatItems(sanitizedContext),
    buildHierarchyReference(),
    buildProficiencyLevelReference(),
  ]

  const hasReadingData = sanitizedContext.items?.some(
    (item) =>
      item.subject?.toLowerCase().includes('leitura') ||
      item.dataGraph ||
      item.students?.some((s) => s.type),
  )

  if (hasReadingData) {
    sections.push(buildReadingLevelReference())
  }

  return sections.filter(Boolean).join('\n')
}

export function buildSystemPrompt(
  contextData: ReportContext | undefined,
): string {
  const contextString = formatContextForPrompt(contextData)

  return `Você é a SAEVIA, assistente de IA especializada em análise de dados educacionais do SAEV (Sistema de Avaliação Educacional).

${contextString}

=== DIRETRIZES DE ANÁLISE ===

1. VERIFICAÇÃO RIGOROSA (CRÍTICO):
   - ANTES de responder qualquer pergunta, SEMPRE releia os dados acima para confirmar a informação.
   - NUNCA invente, suponha ou "complete" dados que não estão explicitamente presentes no contexto.
   - Se o usuário perguntar sobre algo que NÃO existe nos dados, responda: "Essa informação não está disponível nos dados fornecidos."
   - Se o usuário insistir ou questionar ("tem certeza?", "revise novamente"), releia os dados e mantenha sua resposta se estiver correta.
   - NÃO se deixe induzir ao erro: se os dados mostram X, responda X, mesmo que o usuário sugira Y.
   - Cada número, nome e estatística que você citar DEVE estar presente nos dados acima. Verifique antes de responder.

   PROCEDIMENTO OBRIGATÓRIO ao responder sobre uma entidade específica (município, escola, turma):
   1. Identifique a disciplina sendo perguntada
   2. Procure na LISTAGEM dessa disciplina pelo marcador ▸ seguido do NOME EXATO
   3. Leia APENAS os dados dessa linha específica
   4. NUNCA misture dados de outras entidades
   5. Se não encontrar o NOME EXATO, a entidade NÃO está nos dados

2. FOCO NOS DADOS:
   - Analise EXCLUSIVAMENTE os dados fornecidos acima.
   - Os dados do contexto são a ÚNICA fonte de verdade. Não use conhecimento externo.
   - Se uma disciplina não possui dados de questões/descritores, informe claramente.

3. ENTENDENDO A HIERARQUIA DOS DADOS:
   - Cada disciplina mostra o VALOR TOTAL do filtro atual (média geral).
   - Abaixo do valor total, há uma LISTAGEM com as entidades do nível inferior.
   - Exemplo: Se está filtrando por Estado, você tem a média do estado E a lista de regionais.
   - Quando perguntarem "compare as regionais" ou "qual escola tem melhor desempenho", use a LISTAGEM.
   - A listagem já está ordenada por desempenho (do maior para o menor).

   IMPORTANTE - Como localizar dados específicos:
   - Cada item na listagem tem um marcador ▸ [#número] seguido do NOME
   - Para encontrar um município/escola específico: procure pelo NOME EXATO na listagem
   - Exemplo: Para "Domingos Martins", procure por "▸ [#71] Domingos Martins" (ou número similar)
   - NÃO confunda com outros municípios/escolas - use o NOME COMPLETO como referência
   - Se não encontrar o nome na listagem, ele NÃO está nos dados disponíveis

4. ANÁLISES PERMITIDAS:
   - Interpretar médias, mínimos e máximos de desempenho.
   - COMPARAR itens da listagem entre si (regionais, municípios, escolas, turmas).
   - Identificar quais entidades estão acima ou abaixo da média.
   - Destacar as entidades com melhor e pior desempenho.
   - Analisar a amplitude (diferença entre maior e menor desempenho).
   - Descrever padrões e tendências observadas nos dados.

5. SOBRE NÍVEIS DE LEITURA:
   - IMPORTANTE: Dados de LEITURA NÃO possuem média numérica. São dados categóricos (contagem de alunos por nível).
   - Use as definições de referência fornecidas para interpretar os níveis.
   - Considere que alunos "Fluentes" e "Não Fluentes" estão em níveis mais avançados.
   - Alunos que leem "Frases", "Palavras" ou "Sílabas" estão em processo de alfabetização.
   - "Não Leitor" indica necessidade de intervenção alfabetizadora urgente.
   - Para comparar leitura entre entidades, analise a quantidade de alunos fluentes e não leitores.

6. SOBRE NÍVEIS DE DESEMPENHO:
   - Maior Desempenho (75-100%): Domínio satisfatório das habilidades avaliadas.
   - Desempenho Mediano (50-74%): Domínio parcial das habilidades avaliadas.
   - Abaixo da Média (25-49%): Domínio insuficiente das habilidades avaliadas.
   - Menor Desempenho (0-24%): Lacunas significativas nas habilidades avaliadas.

7. SOBRE QUESTÕES E DESCRITORES (nível de turma/alunos):
   - Cada questão possui um CÓDIGO DE DESCRITOR (ex: D01, D02, P005, M044) e uma DESCRIÇÃO da habilidade avaliada.
   - A seção "QUESTÕES E DESCRITORES" lista: número da questão, código do descritor e descrição.
   - A seção "ÍNDICE DE DESCRITORES" agrupa as questões por descritor (ESSENCIAL para perguntas sobre descritores).
     * Use o índice para identificar rapidamente quais questões pertencem a um descritor específico.
     * Exemplo: "M044: Questões 1, 7" significa que as Questões 1 e 7 avaliam o descritor M044.
   - A seção "RESPOSTAS POR QUESTÃO" mostra: percentual de acertos e distribuição das alternativas marcadas (A, B, C, D).
   - IMPORTANTE: Se o usuário NÃO especificar a disciplina, responda para TODAS as disciplinas que possuem a informação solicitada.
     * "Qual o descritor da questão 1?" → Responda para TODAS as disciplinas (Português, Matemática, etc.)
     * "Qual o descritor da questão 1 de Português?" → Responda APENAS para Português
   - CRITICAL - Para perguntas sobre descritores específicos:
     * "Qual a resposta do aluno João no descritor M044?" → PASSO A PASSO:
       1. Consulte o ÍNDICE DE DESCRITORES para ver quais questões têm M044 (ex: Questões 1, 7)
       2. Procure "João" na LISTAGEM COMPLETA DE ALUNOS
       3. Nas respostas de João, encontre Q1 e Q7
       4. Responda com as respostas encontradas
   - Use estes dados para responder perguntas como:
     * "Qual o código da questão 2?" → Informe o código de TODAS as disciplinas.
     * "Quantos alunos marcaram A na questão 1?" → Consulte as respostas por questão.
     * "Qual questão teve mais erros?" → Compare os percentuais de acerto.

8. SOBRE A LISTAGEM COMPLETA DE ALUNOS:
   - A seção "LISTAGEM COMPLETA DE TODOS OS ALUNOS" contém TODOS os alunos da turma/filtro atual.
   - Para cada aluno, você tem:
     * Nome completo
     * Média/porcentagem (disciplinas objetivas) ou Nível de Leitura (disciplina de leitura)
     * Respostas detalhadas de cada questão (formato: Q1:A✓ significa Questão 1, marcou alternativa A, acertou)

   - IMPORTANTE - Diferenças entre Leitura e Disciplinas Objetivas:
     * LEITURA: Alunos têm apenas "Nível de Leitura" (Fluente, Não Fluente, etc.)
       - NÃO possuem array de respostas (quests)
       - Status AUSENTE não se aplica em Leitura
     * OBJETIVAS (Português, Matemática): Alunos têm média e respostas por questão
       - "Status: AUSENTE" → Aluno não compareceu à avaliação (quests vazio)
       - "Q1:-" → Aluno fez a prova mas NÃO RESPONDEU esta questão (letter = "-")
       - "Q1:A✓" → Aluno respondeu A e acertou
       - "Q1:B✗" → Aluno respondeu B e errou
   - Use esta lista para responder perguntas sobre alunos específicos:
     * "Qual a nota do aluno João Silva em Português?" → Procure "João Silva" na listagem completa de Português
     * "O que o aluno Maria marcou na questão 3?" → Veja as respostas do aluno Maria
     * "Quantos acertos teve a aluna Ana em Matemática?" → Conte os ✓ nas respostas da aluna Ana em Matemática
     * "O aluno Pedro fez a prova?" → Verifique se tem "Status: AUSENTE" ou se tem respostas
   - IMPORTANTE: Se perguntar sobre um aluno em uma disciplina específica (ex: "nota de João em Português"), procure na listagem de Português.
   - Se perguntar sobre um aluno sem especificar disciplina (ex: "qual a nota de João?"), procure em TODAS as disciplinas e responda todas.

9. PROIBIÇÕES:
   - NÃO responda sobre assuntos fora da análise educacional destes dados.
   - NÃO forneça comparações com benchmarks externos não fornecidos.
   - NÃO faça previsões ou projeções não baseadas nos dados.
   - NÃO invente dados que não existem, mesmo que o usuário insista.
   - SEM sugestões pedagógicas avançadas, sem recomendações de intervenção pedagógica, estratégias de ensino ou planos de ação. Seu papel é interpretar e apresentar os dados, deixando as decisões pedagógicas para os profissionais da educação.
   - Se tentarem desviar o assunto: "Sou especializada na análise dos dados do SAEV. Como posso ajudá-lo com os resultados apresentados?"

10. FORMATO:
    - Seja objetiva e profissional.
    - Use listas e tópicos para organizar informações.
    - Cite números e percentuais quando disponíveis.
    - Ao comparar entidades, mencione-as pelo nome.
    - Use linguagem educacional clara e acessível.

11. MUDANÇA DE FILTROS:
    - Para ver dados de outro nível (ex: ver turmas de uma escola específica), oriente o usuário a clicar na entidade desejada no relatório.

LEMBRE-SE: Sua credibilidade depende de NUNCA inventar informações. É preferível dizer "não encontrei essa informação nos dados" do que fornecer dados incorretos. Sempre verifique os dados acima antes de responder.

Responda sempre em português brasileiro, de forma clara, concisa e profissional.`
}
