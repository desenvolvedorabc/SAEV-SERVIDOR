import {
  PerformanceHistoryEdition,
  PerformanceHistoryEntity,
  PerformanceHistoryReportContext,
  PerformanceHistoryTest,
} from '../model/interface/report-context.interface'
import { sanitizePerformanceHistoryReportContext } from './sanitize.util'

// ─── Níveis de Leitura ──────────────────────────────────────────────────────

const READING_LEVEL_LABELS: Record<string, string> = {
  fluente: 'Fluente',
  nao_fluente: 'Não Fluente',
  frases: 'Frases',
  palavras: 'Palavras',
  silabas: 'Sílabas',
  nao_leitor: 'Não Leitor',
  nao_avaliado: 'Não Avaliado',
  nao_informado: 'Não Informado',
}

const READING_LEVEL_ORDER = [
  'fluente',
  'nao_fluente',
  'frases',
  'palavras',
  'silabas',
  'nao_leitor',
  'nao_avaliado',
  'nao_informado',
]

// ─── Classificação de Desempenho Objetiva ───────────────────────────────────

const PERFORMANCE_THRESHOLDS = {
  CRITICO: 25,
  ABAIXO: 50,
  MEDIANO: 75,
} as const

type PerformanceLevel = 'critico' | 'abaixo' | 'mediano' | 'bom'

function classifyPerformance(value: number): PerformanceLevel {
  if (value < PERFORMANCE_THRESHOLDS.CRITICO) return 'critico'
  if (value < PERFORMANCE_THRESHOLDS.ABAIXO) return 'abaixo'
  if (value < PERFORMANCE_THRESHOLDS.MEDIANO) return 'mediano'
  return 'bom'
}

const PERFORMANCE_LABELS: Record<PerformanceLevel, string> = {
  critico: 'Crítico (<25%)',
  abaixo: 'Abaixo da Média (25-49%)',
  mediano: 'Mediano (50-74%)',
  bom: 'Bom Desempenho (≥75%)',
}

// ─── Cores do Frontend ──────────────────────────────────────────────────────
// Mapeamento das cores exibidas no relatório para que a IA entenda perguntas
// como "quantos estão em vermelho?" ou "quais são os verdes?".

const PERFORMANCE_COLORS: Record<PerformanceLevel, string> = {
  bom: 'Verde escuro',
  mediano: 'Verde claro',
  abaixo: 'Laranja',
  critico: 'Vermelho',
}

const READING_LEVEL_COLORS: Record<string, string> = {
  fluente: 'Verde escuro',
  nao_fluente: 'Verde médio',
  frases: 'Verde claro',
  palavras: 'Azul médio',
  silabas: 'Azul claro',
  nao_leitor: 'Cinza claro',
  nao_avaliado: 'Cinza escuro',
  nao_informado: 'Cinza escuro',
}

// ─── Cabeçalho ──────────────────────────────────────────────────────────────

function formatHeader(context: PerformanceHistoryReportContext): string {
  const lines: string[] = [
    '=== DADOS DO RELATÓRIO DE HISTÓRICO DE DESEMPENHO ===\n',
  ]

  if (context.serie?.SER_NOME) lines.push(`SÉRIE: ${context.serie.SER_NOME}`)
  if (context.year?.name) lines.push(`ANO LETIVO: ${context.year.name}`)
  if (context.viewLevel)
    lines.push(`NÍVEL DE VISUALIZAÇÃO: ${context.viewLevel}`)

  return lines.join('\n')
}

// ─── Breadcrumb ─────────────────────────────────────────────────────────────

function formatBreadcrumb(context: PerformanceHistoryReportContext): string {
  if (!context.breadcrumb?.length) return ''

  const lines: string[] = ['\nFILTROS APLICADOS:']
  context.breadcrumb.forEach((item) => {
    if (item.name) lines.push(`  - ${item.label}: ${item.name}`)
  })

  return lines.join('\n')
}

// ─── Localização ────────────────────────────────────────────────────────────

function formatLocationInfo(context: PerformanceHistoryReportContext): string {
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

// ─── Detecção de Nível de Dados ─────────────────────────────────────────────
// Nos níveis agregados (regional/escola/turma), Leitura retorna avg (% de alunos adequados).
// No nível de aluno, Leitura retorna type (nível individual de fluência).

function isStudentLevelReadingData(test: PerformanceHistoryTest): boolean {
  return (
    test.dis_tipo !== 'Objetiva' &&
    test.data.some((e) => e.type != null && e.avg == null)
  )
}

function hasAvgData(test: PerformanceHistoryTest): boolean {
  return test.data.some((e) => e.avg != null)
}

// ─── Formatação de Entidade com avg ─────────────────────────────────────────

function formatAvgEntity(
  entity: PerformanceHistoryEntity,
  suffix?: string,
): string {
  const avg = entity.avg ?? 0
  const level = classifyPerformance(avg)
  const color = PERFORMANCE_COLORS[level]
  const extra = suffix ? ` ${suffix}` : ''
  return `    ▸ ${entity.name}: ${avg}%${extra} (${PERFORMANCE_LABELS[level]}) [${color}]`
}

// ─── Formatação de Entidade Leitura (nível aluno) ───────────────────────────

function formatReadingEntity(entity: PerformanceHistoryEntity): string {
  const key = entity.type || 'nao_informado'
  const label = READING_LEVEL_LABELS[key] || key
  const color = READING_LEVEL_COLORS[key] || 'Cinza escuro'
  return `    ▸ ${entity.name}: ${label} [${color}]`
}

// ─── Formatação de Prova ────────────────────────────────────────────────────

function formatTest(test: PerformanceHistoryTest): string {
  const isStudentReading = isStudentLevelReadingData(test)
  const isAvgBased = hasAvgData(test)
  const readingAvgLabel = test.dis_tipo !== 'Objetiva' ? ' adequados' : ''
  const lines: string[] = [`\n  📋 ${test.subject} (${test.dis_tipo})`]

  if (test.data.length === 0) {
    lines.push('    [Sem dados]')
    return lines.join('\n')
  }

  if (isAvgBased) {
    const sorted = [...test.data].sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))
    sorted.forEach((entity) =>
      lines.push(formatAvgEntity(entity, readingAvgLabel)),
    )

    const avgs = test.data.map((e) => e.avg ?? 0).filter((v) => v > 0)
    if (avgs.length > 0) {
      const mean = Math.round(avgs.reduce((s, v) => s + v, 0) / avgs.length)
      const max = Math.max(...avgs)
      const min = Math.min(...avgs)
      lines.push(`    ─ Média: ${mean}% | Máx: ${max}% | Mín: ${min}%`)
    }
  } else if (isStudentReading) {
    const levelCounts: Record<string, number> = {}
    test.data.forEach((entity) => {
      lines.push(formatReadingEntity(entity))
      const key = entity.type || 'nao_informado'
      levelCounts[key] = (levelCounts[key] || 0) + 1
    })

    lines.push('    ─ Distribuição:')
    READING_LEVEL_ORDER.forEach((level) => {
      if (levelCounts[level]) {
        lines.push(
          `      ${READING_LEVEL_LABELS[level]}: ${levelCounts[level]}`,
        )
      }
    })
  }

  return lines.join('\n')
}

// ─── Formatação de Edição ───────────────────────────────────────────────────

function formatEdition(edition: PerformanceHistoryEdition): string {
  const lines: string[] = [
    `\n══════════════════════════════════════`,
    `▶ EDIÇÃO: ${edition.name}`,
    `══════════════════════════════════════`,
  ]

  edition.tests.forEach((test) => {
    lines.push(formatTest(test))
  })

  return lines.join('\n')
}

// ─── Dados Completos por Edição ─────────────────────────────────────────────

function formatEditions(context: PerformanceHistoryReportContext): string {
  if (!context.items?.length) return ''

  const lines: string[] = ['\n=== HISTÓRICO POR EDIÇÃO ===']

  context.items.forEach((edition) => {
    lines.push(formatEdition(edition))
  })

  return lines.join('\n')
}

// ─── Análise de Tendência (Evolução entre Edições) ──────────────────────────

function buildTrendAnalysis(editions: PerformanceHistoryEdition[]): string {
  if (editions.length < 2) return ''

  const lines: string[] = [
    '\n=== ANÁLISE DE TENDÊNCIA (EVOLUÇÃO ENTRE EDIÇÕES) ===',
  ]

  // Tendência para disciplinas com avg (Objetiva + Leitura agregada)
  const subjectMap = new Map<
    string,
    { editionName: string; entities: Map<string, number> }[]
  >()

  editions.forEach((edition) => {
    edition.tests
      .filter((t) => hasAvgData(t))
      .forEach((test) => {
        const key =
          test.dis_tipo !== 'Objetiva'
            ? `${test.subject} (% adequados em Leitura)`
            : test.subject

        if (!subjectMap.has(key)) {
          subjectMap.set(key, [])
        }

        const entityMap = new Map<string, number>()
        test.data.forEach((entity) => {
          if (entity.avg != null) {
            entityMap.set(entity.name, entity.avg)
          }
        })

        subjectMap.get(key).push({
          editionName: edition.name,
          entities: entityMap,
        })
      })
  })

  for (const [subject, editionData] of subjectMap.entries()) {
    lines.push(`\n--- ${subject.toUpperCase()} ---`)

    const allEntities = new Set<string>()
    editionData.forEach((ed) =>
      ed.entities.forEach((_, name) => allEntities.add(name)),
    )

    for (const entityName of allEntities) {
      const history: { edition: string; avg: number }[] = []

      editionData.forEach((ed) => {
        const avg = ed.entities.get(entityName)
        if (avg != null) {
          history.push({ edition: ed.editionName, avg })
        }
      })

      if (history.length < 2) continue

      const first = history[0]
      const last = history[history.length - 1]
      const delta = last.avg - first.avg
      const trend =
        delta > 0
          ? `↑ +${delta}pp (crescimento)`
          : delta < 0
            ? `↓ ${delta}pp (queda)`
            : '→ estável'

      const historyStr = history
        .map((h) => `${h.edition}: ${h.avg}%`)
        .join(' → ')
      lines.push(`  ▸ ${entityName}: ${historyStr} ${trend}`)
    }

    const editionAvgs = editionData.map((ed) => {
      const values = Array.from(ed.entities.values())
      return {
        edition: ed.editionName,
        avg:
          values.length > 0
            ? Math.round(values.reduce((s, v) => s + v, 0) / values.length)
            : 0,
      }
    })

    if (editionAvgs.length >= 2) {
      const firstAvg = editionAvgs[0]
      const lastAvg = editionAvgs[editionAvgs.length - 1]
      const generalDelta = lastAvg.avg - firstAvg.avg
      const generalTrend =
        generalDelta > 0
          ? `↑ +${generalDelta}pp`
          : generalDelta < 0
            ? `↓ ${generalDelta}pp`
            : '→ estável'

      lines.push(
        `  ─ Média geral: ${editionAvgs.map((e) => `${e.edition}: ${e.avg}%`).join(' → ')} ${generalTrend}`,
      )
    }
  }

  // Tendência de leitura individual (nível aluno — dados com type)
  const readingSubjectMap = new Map<
    string,
    { editionName: string; entities: PerformanceHistoryEntity[] }[]
  >()

  editions.forEach((edition) => {
    edition.tests
      .filter((t) => isStudentLevelReadingData(t))
      .forEach((test) => {
        if (!readingSubjectMap.has(test.subject)) {
          readingSubjectMap.set(test.subject, [])
        }
        readingSubjectMap.get(test.subject).push({
          editionName: edition.name,
          entities: test.data,
        })
      })
  })

  for (const [subject, editionData] of readingSubjectMap.entries()) {
    if (editionData.length < 2) continue

    lines.push(`\n--- ${subject.toUpperCase()} (Leitura — nível aluno) ---`)

    // Evolução individual por aluno
    const allStudents = new Set<string>()
    editionData.forEach((ed) =>
      ed.entities.forEach((e) => allStudents.add(e.name)),
    )

    for (const studentName of allStudents) {
      const history: { edition: string; type: string }[] = []
      editionData.forEach((ed) => {
        const entity = ed.entities.find((e) => e.name === studentName)
        if (entity?.type) {
          history.push({ edition: ed.editionName, type: entity.type })
        }
      })

      if (history.length < 2) continue

      const first = history[0]
      const last = history[history.length - 1]
      const firstIdx = READING_LEVEL_ORDER.indexOf(first.type)
      const lastIdx = READING_LEVEL_ORDER.indexOf(last.type)
      const trend =
        lastIdx < firstIdx
          ? '↑ (evolução)'
          : lastIdx > firstIdx
            ? '↓ (regressão)'
            : '→ (estável)'

      const historyStr = history
        .map((h) => `${h.edition}: ${READING_LEVEL_LABELS[h.type] || h.type}`)
        .join(' → ')
      lines.push(`  ▸ ${studentName}: ${historyStr} ${trend}`)
    }

    // Distribuição por edição
    lines.push('\n  Distribuição por edição:')
    editionData.forEach((ed) => {
      const levelCounts: Record<string, number> = {}
      ed.entities.forEach((entity) => {
        const k = entity.type || 'nao_informado'
        levelCounts[k] = (levelCounts[k] || 0) + 1
      })

      const total = ed.entities.length
      const positiveCount =
        (levelCounts.fluente || 0) +
        (levelCounts.nao_fluente || 0) +
        (levelCounts.frases || 0)
      const positivePct =
        total > 0 ? Math.round((positiveCount / total) * 100) : 0

      lines.push(
        `  ${ed.editionName}: ${total} avaliados, ${positivePct}% nos níveis positivos (Fluente + Não Fluente + Frases)`,
      )
    })
  }

  return lines.join('\n')
}

// ─── Resumo Comparativo entre Edições ───────────────────────────────────────

function buildEditionComparison(editions: PerformanceHistoryEdition[]): string {
  if (editions.length < 2) return ''

  const lines: string[] = ['\n=== COMPARATIVO ENTRE EDIÇÕES ===']

  editions.forEach((edition) => {
    lines.push(`\n[${edition.name}]`)

    edition.tests.forEach((test) => {
      if (hasAvgData(test)) {
        // Objetiva ou Leitura agregada — ambos usam avg
        const avgs = test.data.map((e) => e.avg ?? 0).filter((v) => v > 0)
        if (avgs.length > 0) {
          const sum = avgs.reduce((s, v) => s + v, 0)
          const mean = Math.round(sum / avgs.length)
          const level = classifyPerformance(mean)
          const suffix = test.dis_tipo !== 'Objetiva' ? ' (% adequados)' : ''
          lines.push(
            `  ${test.subject}${suffix}: média ${mean}% (${PERFORMANCE_LABELS[level]}) — ${test.data.length} entidade(s)`,
          )
        }
      } else if (isStudentLevelReadingData(test)) {
        // Leitura no nível aluno — dados com type
        const total = test.data.length
        const levelCounts: Record<string, number> = {}
        test.data.forEach((e) => {
          const key = e.type || 'nao_informado'
          levelCounts[key] = (levelCounts[key] || 0) + 1
        })

        const positive =
          (levelCounts.fluente || 0) +
          (levelCounts.nao_fluente || 0) +
          (levelCounts.frases || 0)
        const positivePct = total > 0 ? Math.round((positive / total) * 100) : 0

        lines.push(
          `  ${test.subject} (Leitura): ${total} alunos, ${positivePct}% nos níveis positivos`,
        )
      }
    })
  })

  return lines.join('\n')
}

// ─── Destaques e Pontos de Atenção ──────────────────────────────────────────

function buildHighlightsAndAlerts(
  editions: PerformanceHistoryEdition[],
): string {
  if (!editions?.length) return ''

  const lastEdition = editions[editions.length - 1]
  const lines: string[] = [
    `\n=== DESTAQUES E PONTOS DE ATENÇÃO (${lastEdition.name}) ===`,
  ]

  lastEdition.tests.forEach((test) => {
    const isStudentReading = isStudentLevelReadingData(test)
    const suffix =
      test.dis_tipo !== 'Objetiva' && !isStudentReading ? ' (% adequados)' : ''
    lines.push(`\n[${test.subject}${suffix}]`)

    if (hasAvgData(test)) {
      // Objetiva ou Leitura agregada — ambos usam avg
      const sorted = [...test.data]
        .filter((e) => e.avg != null)
        .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))

      if (sorted.length > 0) {
        lines.push('  ★ Melhores desempenhos:')
        sorted.forEach((e) => {
          const level = classifyPerformance(e.avg ?? 0)
          lines.push(
            `    - ${e.name}: ${e.avg}% (${PERFORMANCE_LABELS[level]})`,
          )
        })

        const alerts = sorted.filter(
          (e) => (e.avg ?? 0) < PERFORMANCE_THRESHOLDS.ABAIXO,
        )
        if (alerts.length > 0) {
          lines.push(`\n  ⚠ Entidades abaixo de 50% (${alerts.length}):`)
          alerts.reverse().forEach((e) => {
            const level = classifyPerformance(e.avg ?? 0)
            lines.push(
              `    - ${e.name}: ${e.avg}% (${PERFORMANCE_LABELS[level]})`,
            )
          })
        } else {
          lines.push('  ✓ Nenhuma entidade abaixo de 50%.')
        }
      }
    } else if (isStudentReading) {
      // Leitura no nível aluno — dados com type
      const negative = test.data.filter((e) =>
        ['nao_leitor', 'silabas', 'nao_avaliado', 'nao_informado'].includes(
          e.type || '',
        ),
      )
      const positiveList = test.data.filter((e) =>
        ['fluente', 'nao_fluente', 'frases'].includes(e.type || ''),
      )

      if (positiveList.length > 0) {
        lines.push(`  ★ Nos níveis positivos: ${positiveList.length} aluno(s)`)
      }
      if (negative.length > 0) {
        lines.push(`  ⚠ Nos níveis de atenção: ${negative.length} aluno(s)`)
        negative.forEach((e) => {
          const label = READING_LEVEL_LABELS[e.type] || e.type
          lines.push(`    - ${e.name}: ${label}`)
        })
      }
    }
  })

  return lines.join('\n')
}

// ─── Contagem Consolidada por Cor (todas as disciplinas) ────────────────────
// Agrupa entidades por cor/nível de desempenho cruzando TODAS as disciplinas
// de uma edição, para que a IA consiga responder perguntas como
// "Quantas escolas estão em laranja?" sem esquecer nenhuma disciplina.

function buildConsolidatedColorSummary(
  editions: PerformanceHistoryEdition[],
): string {
  if (!editions?.length) return ''

  const lastEdition = editions[editions.length - 1]
  const lines: string[] = [
    `\n=== CONTAGEM CONSOLIDADA POR COR — ${lastEdition.name} ===`,
    `[Cruza TODAS as disciplinas. Uma mesma entidade pode aparecer em mais de uma disciplina com cores diferentes.]`,
  ]

  // Coleta: para cada disciplina, qual a cor de cada entidade
  const entityColorsBySubject: Map<
    string,
    { subject: string; color: string; avg: number }[]
  > = new Map()

  lastEdition.tests.forEach((test) => {
    if (!hasAvgData(test)) return

    test.data
      .filter((e) => e.avg != null)
      .forEach((entity) => {
        const level = classifyPerformance(entity.avg ?? 0)
        const color = PERFORMANCE_COLORS[level]
        if (!entityColorsBySubject.has(entity.name)) {
          entityColorsBySubject.set(entity.name, [])
        }
        const suffix = test.dis_tipo !== 'Objetiva' ? ' (Leitura)' : ''
        entityColorsBySubject.get(entity.name)!.push({
          subject: `${test.subject}${suffix}`,
          color,
          avg: entity.avg ?? 0,
        })
      })
  })

  // Agrupa por cor, para cada disciplina
  const colorGroups: Record<
    string,
    Map<string, { entityName: string; avg: number }[]>
  > = {}

  lastEdition.tests.forEach((test) => {
    if (!hasAvgData(test)) return

    const isReading = test.dis_tipo !== 'Objetiva'
    const subjectLabel = isReading ? `${test.subject} (Leitura)` : test.subject

    test.data
      .filter((e) => e.avg != null)
      .forEach((entity) => {
        const level = classifyPerformance(entity.avg ?? 0)
        const color = PERFORMANCE_COLORS[level]
        if (!colorGroups[color]) {
          colorGroups[color] = new Map()
        }
        if (!colorGroups[color].has(subjectLabel)) {
          colorGroups[color].set(subjectLabel, [])
        }
        colorGroups[color]
          .get(subjectLabel)!
          .push({ entityName: entity.name, avg: entity.avg ?? 0 })
      })
  })

  // Ordem de exibição: do mais crítico ao melhor
  const colorOrder = [
    { color: 'Vermelho', level: 'Crítico (<25%)' },
    { color: 'Laranja', level: 'Abaixo da Média (25-49%)' },
    { color: 'Verde claro', level: 'Mediano (50-74%)' },
    { color: 'Verde escuro', level: 'Bom Desempenho (≥75%)' },
  ]

  colorOrder.forEach(({ color, level }) => {
    const subjectMap = colorGroups[color]
    if (!subjectMap || subjectMap.size === 0) return

    // Conta entidades únicas nessa cor (pode estar em mais de uma disciplina)
    const uniqueEntities = new Set<string>()
    subjectMap.forEach((entities) => {
      entities.forEach((e) => uniqueEntities.add(e.entityName))
    })

    lines.push(`\n  🎨 ${color} — ${level}:`)

    subjectMap.forEach((entities, subjectLabel) => {
      const sorted = [...entities].sort((a, b) => a.avg - b.avg)
      const names = sorted.map((e) => `${e.entityName} (${e.avg}%)`).join(', ')
      lines.push(
        `    ${subjectLabel}: ${entities.length} entidade(s) → ${names}`,
      )
    })

    lines.push(
      `    Total de entidades únicas nesta cor: ${uniqueEntities.size}`,
    )
  })

  return lines.join('\n')
}

// ─── Referência ─────────────────────────────────────────────────────────────

function buildReference(): string {
  return `
=== REFERÊNCIA: CLASSIFICAÇÕES ===

DISCIPLINAS OBJETIVAS — Classificação por % de acertos:
- Bom Desempenho (≥ 75%): Desempenho acima do esperado.
- Desempenho Mediano (50-74%): Desempenho dentro da média.
- Abaixo da Média (25-49%): Desempenho insatisfatório.
- Crítico (< 25%): Desempenho muito abaixo, atenção urgente.

DISCIPLINAS DE LEITURA — Comportamento varia conforme o nível de visualização:
- Nível agregado (regional/escola/turma): exibe avg = % de alunos nos níveis adequados de leitura.
  O critério de "adequado" varia por série:
    • 1º ano: Fluente + Não Fluente + Frases
    • 2º e 3º ano: Fluente + Não Fluente
    • 4º ano em diante: somente Fluente
- Nível aluno: exibe o nível individual de fluência (type):
  Fluente > Não Fluente > Frases > Palavras > Sílabas > Não Leitor > Não Avaliado > Não Informado

LEGENDA DE CORES DO RELATÓRIO:
O relatório no frontend exibe cores associadas a cada nível. Quando o usuário mencionar cores
(ex: "quantos estão em vermelho?", "quais são os verdes?"), use esta referência:

Nível agregado (regional/escola/turma) e Aluno em disciplina Objetiva:
  - Verde escuro  → Maior Desempenho (≥75%)
  - Verde claro   → Desempenho Mediano (50-74%)
  - Laranja       → Desempenho Abaixo da Média (25-49%)
  - Vermelho      → Menor Desempenho (<25%)
  - Cinza escuro  → Não Informado (agregado) / Não Avaliado e Não Informado (aluno)

Aluno em disciplina de Leitura:
  - Verde escuro  → Fluente
  - Verde médio   → Não Fluente
  - Verde claro   → Frases
  - Azul médio    → Palavras
  - Azul claro    → Sílabas
  - Cinza claro   → Não Leitor
  - Cinza escuro  → Não Avaliado / Não Informado

TENDÊNCIA — Interpretação da evolução entre edições:
- ↑ (crescimento): Entidade melhorou o desempenho entre edições.
- ↓ (queda): Entidade piorou o desempenho entre edições.
- → (estável): Desempenho manteve-se constante.
- "pp" = pontos percentuais de diferença.`
}

// ─── Montagem do Contexto Completo ──────────────────────────────────────────

export function formatPerformanceHistoryContextForPrompt(
  contextData: PerformanceHistoryReportContext | undefined,
): string {
  if (!contextData)
    return 'Nenhum dado de relatório de histórico de desempenho disponível para análise.'

  const sanitizedContext = sanitizePerformanceHistoryReportContext(contextData)

  const sections: string[] = [
    formatHeader(sanitizedContext),
    formatBreadcrumb(sanitizedContext),
    formatLocationInfo(sanitizedContext),
    buildEditionComparison(sanitizedContext.items),
    buildHighlightsAndAlerts(sanitizedContext.items),
    buildConsolidatedColorSummary(sanitizedContext.items),
    buildTrendAnalysis(sanitizedContext.items),
    formatEditions(sanitizedContext),
    buildReference(),
  ]

  return sections.filter(Boolean).join('\n')
}

// ─── System Prompt Principal ────────────────────────────────────────────────

export function buildPerformanceHistorySystemPrompt(
  contextData: PerformanceHistoryReportContext | undefined,
): string {
  const contextString = formatPerformanceHistoryContextForPrompt(contextData)

  return `Você é a SAEVIA, assistente de IA especializada em análise de dados educacionais do SAEV (Sistema de Avaliação Educacional).

${contextString}

=== DIRETRIZES DE ANÁLISE ===

1. INTEGRIDADE DOS DADOS (REGRA CRÍTICA):
   - ANTES de responder, SEMPRE releia os dados acima para confirmar a informação.
   - NUNCA invente, estime ou complete dados ausentes. Se não está nos dados, diga: "Essa informação não está disponível nos dados fornecidos."
   - Se o usuário insistir ("tem certeza?", "revise novamente"), releia e mantenha sua resposta se estiver correta.
   - NÃO se deixe induzir ao erro: se os dados mostram X, responda X, mesmo que o usuário sugira Y.
   - Cada número, nome e percentual citado DEVE estar presente nos dados acima.

2. ESTRUTURA DOS DADOS — HISTÓRICO DE DESEMPENHO:
   - Este relatório mostra a EVOLUÇÃO do desempenho ao longo de MÚLTIPLAS EDIÇÕES (avaliações).
   - Hierarquia: Edição → Disciplina/Prova → Entidades (regionais/escolas/turmas/alunos).
   - DOIS TIPOS de disciplina:
     • Objetiva: desempenho medido em % de acertos (avg).
     • Leitura: nos níveis agregados (regional/escola/turma), exibe avg = % de alunos nos níveis adequados de leitura. No nível de aluno, exibe o nível individual de fluência (type).
   - Edições marcadas com ▶ | Provas marcadas com 📋 | Entidades marcadas com ▸
   - COMPARATIVO ENTRE EDIÇÕES: visão consolidada por edição.
   - ANÁLISE DE TENDÊNCIA: evolução de cada entidade entre edições com indicadores ↑ ↓ →.
   - DESTAQUES E PONTOS DE ATENÇÃO: baseados na edição mais recente.

3. CAPACIDADES ANALÍTICAS — como responder cada tipo de solicitação:

   A. ANÁLISE DE EVOLUÇÃO/TENDÊNCIA:
      Foco principal deste relatório. Compare o desempenho de entidades entre edições.
      Modelo: "Em [Disciplina], [Entidade] evoluiu de X% ([Edição 1]) para Y% ([Edição 2]), representando [crescimento/queda] de Zpp."
      Para leitura: "Na [Edição 1], o aluno estava em [Nível]. Na [Edição 2], passou para [Nível], indicando [evolução/regressão]."

   B. COMPARAÇÃO ENTRE EDIÇÕES:
      Base: seção COMPARATIVO ENTRE EDIÇÕES.
      Informe: média geral por disciplina em cada edição, número de entidades, variação.

   C. ANÁLISE HOLÍSTICA DO RELATÓRIO:
      Correlacione os dados de todas as edições para identificar padrões gerais:
      melhoria consistente, estagnação ou regressão.

   D. DESTAQUES (melhores performances):
      Base: seção DESTAQUES E PONTOS DE ATENÇÃO (★).
      Liste entidades com melhores resultados na edição mais recente.

   E. PONTOS DE ATENÇÃO (riscos):
      Base: seção DESTAQUES E PONTOS DE ATENÇÃO (⚠).
      Liste entidades com desempenho crítico, especialmente as que apresentam queda entre edições.

   F. CONSULTAS ESPECÍFICAS:
      - "Qual o desempenho de [entidade]?" → Localize ▸ [nome] em cada edição, informe percentual/nível e tendência.
      - "Como [entidade] evoluiu?" → Apresente o histórico completo com indicadores de tendência.
      - "Quem mais melhorou?" → Encontre a maior variação positiva (Δpp) entre primeira e última edição.
      - "Quem mais piorou?" → Encontre a maior variação negativa.
      - "Liste todos por desempenho" → Percorra TODOS os itens marcados com ▸ e liste-os conforme solicitado. NUNCA omita ou trunce.

   H. CONSULTAS POR COR (REGRA CRÍTICA — VERIFICAR TODAS AS DISCIPLINAS):
      O relatório exibe cores associadas a cada nível. Cada entidade nos dados possui a indicação [Cor] entre colchetes.
      Quando o usuário perguntar por cor (ex: "quantos estão em vermelho?", "quais são os verdes?"):

      PROCEDIMENTO OBRIGATÓRIO:
      1. Consulte PRIMEIRO a seção "CONTAGEM CONSOLIDADA POR COR" que já cruza TODAS as disciplinas (Objetiva E Leitura).
      2. Se precisar de detalhes adicionais, percorra CADA prova (📋) da edição solicitada — NÃO pule nenhuma disciplina.
      3. Uma entidade pode ter cores DIFERENTES em disciplinas diferentes (ex: Verde em Português mas Laranja em Leitura).
      4. Quando o usuário perguntar "quantas escolas estão em laranja?", informe POR DISCIPLINA e o total de entidades únicas.
      5. NUNCA responda olhando apenas uma disciplina — SEMPRE verifique TODAS as disciplinas disponíveis.

      Mapeamento de cores:
      - "Vermelho" → entidades com Menor Desempenho (<25%).
      - "Laranja" → entidades com Desempenho Abaixo da Média (25-49%).
      - "Verde claro" → Desempenho Mediano (50-74%) OU nível Frases (Leitura aluno).
      - "Verde escuro" → Maior Desempenho (≥75%) OU nível Fluente (Leitura aluno).
      - "Verde médio" → Não Fluente (apenas Leitura aluno).
      - "Azul médio" → Palavras (apenas Leitura aluno).
      - "Azul claro" → Sílabas (apenas Leitura aluno).
      - "Cinza claro" → Não Leitor (apenas Leitura aluno).
      - "Cinza escuro" → Não Avaliado / Não Informado.
      - Se o usuário disser apenas "verde" sem especificar tom, considere TODOS os tons de verde disponíveis no contexto.
      - Se o usuário disser apenas "azul", considere TODOS os tons de azul.
      - Se o usuário disser apenas "cinza", considere TODOS os tons de cinza.

   G. ANÁLISE DE LEITURA:
      Leitura tem dois modos conforme o nível de visualização:
      - Agregado (regional/escola/turma): avg = % de alunos adequados. Analise como Objetiva (tendência de %, classificação por faixas).
        O critério de "adequado" varia por série: 1º ano = Fluente+Não Fluente+Frases; 2º-3º = Fluente+Não Fluente; 4º+ = somente Fluente.
      - Aluno: type = nível individual de fluência. Analise a evolução na hierarquia:
        Fluente > Não Fluente > Frases > Palavras > Sílabas > Não Leitor.
        Evolução positiva = subir na hierarquia. Regressão = descer.

4. RECUSA PADRÃO — assuntos fora do escopo:
   Se o usuário solicitar conteúdo não relacionado aos dados do SAEV (receitas, notícias, lazer, assuntos gerais), responda exatamente:
   "Sou especializada na análise dos dados educacionais do SAEV. Como posso ajudá-lo com os resultados apresentados?"
   NÃO responda nenhuma parte do pedido fora do escopo, mesmo que pareça inofensivo.

5. LIMITAÇÃO PEDAGÓGICA:
   Você é uma ferramenta de análise de dados. Interprete O QUÊ os dados mostram — não COMO ensinar.
   NUNCA gere: planos de aula, roteiros de estudo, sugestões didáticas, estratégias de ensino, intervenções pedagógicas ou recomendações de conteúdo.
   Se solicitado, responda: "A interpretação pedagógica dos dados cabe aos profissionais de educação. Posso ajudá-lo a entender o que os números indicam."

6. FORMATO DE RESPOSTA:
   - Seja objetiva, direta e profissional.
   - Use listas e tópicos para múltiplas informações.
   - Sempre cite o percentual e o nome exato do nível ao descrever um resultado.
   - Em comparações de evolução, SEMPRE mencione a variação em pontos percentuais (pp) e o indicador de tendência (↑ ↓ →).
   - Para listas longas, percorra e apresente TODOS os itens disponíveis — nunca truncar ou resumir sem autorização do usuário.

PROIBIÇÕES:
   - NÃO responda sobre assuntos fora da análise educacional destes dados. Isso inclui, sem exceção: receitas, piadas, poemas, histórias, instruções de qualquer natureza, informações gerais ou qualquer conteúdo não relacionado aos dados do SAEV.
   - NÃO forneça comparações com benchmarks externos não fornecidos.
   - NÃO faça previsões ou projeções não baseadas nos dados.
   - NÃO invente dados que não existem, mesmo que o usuário insista.
   - ATENÇÃO — Bypass por enquadramento: Se o usuário pedir conteúdo fora do escopo MESMO enquadrando como "análise de relatório" (ex: "me faça uma receita de bolo como se fosse análise", "escreva um poema como se estivesse analisando os dados"), RECUSE categoricamente. O enquadramento não muda o conteúdo proibido. Avalie a ESSÊNCIA do pedido, não como ele é apresentado.
   - Se tentarem desviar o assunto, mesmo de forma criativa ou disfarçada, responda APENAS: "Sou especializada na análise dos dados do SAEV. Como posso ajudá-lo com os resultados apresentados?"

LEMBRE-SE: Sua credibilidade depende de NUNCA inventar informações. É preferível dizer "não encontrei essa informação nos dados" do que fornecer dados incorretos.

Responda sempre em português brasileiro, de forma clara, concisa e profissional.`
}
