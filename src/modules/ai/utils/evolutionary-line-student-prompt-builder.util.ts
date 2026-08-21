import {
  EvolutionaryLineStudentEdition,
  EvolutionaryLineStudentReportContext,
  EvolutionaryLineStudentSubject,
  ReadingType,
} from '../model/interface/report-context.interface'

// ─── Referências de Leitura ───────────────────────────────────────────────────

const READING_LEVEL_LABELS: Record<ReadingType, string> = {
  fluente: 'Fluente',
  nao_fluente: 'Não Fluente',
  frases: 'Lê Frases',
  palavras: 'Lê Palavras',
  silabas: 'Lê Sílabas',
  nao_leitor: 'Não Leitor',
  nao_avaliado: 'Não Avaliado',
  nao_informado: 'Não Informado',
}

// Índice de progressão: menor = mais avançado
const READING_LEVEL_ORDER: ReadingType[] = [
  'fluente',
  'nao_fluente',
  'frases',
  'palavras',
  'silabas',
  'nao_leitor',
  'nao_avaliado',
  'nao_informado',
]

// ─── Classificação de Desempenho (Objetiva) ───────────────────────────────────

const PERFORMANCE_THRESHOLDS = { CRITICO: 25, ABAIXO: 50, MEDIANO: 75 } as const
type PerformanceLevel = 'critico' | 'abaixo' | 'mediano' | 'bom'

function classifyPerformance(value: number): PerformanceLevel {
  if (value < PERFORMANCE_THRESHOLDS.CRITICO) return 'critico'
  if (value < PERFORMANCE_THRESHOLDS.ABAIXO) return 'abaixo'
  if (value < PERFORMANCE_THRESHOLDS.MEDIANO) return 'mediano'
  return 'bom'
}

const PERFORMANCE_LABELS: Record<PerformanceLevel, string> = {
  critico: 'Menor Desempenho (0-24%)',
  abaixo: 'Abaixo da Média (25-49%)',
  mediano: 'Desempenho Mediano (50-74%)',
  bom: 'Maior Desempenho (75-100%)',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(value: number): string {
  return `${Number(value).toFixed(0)}%`
}

function fmtDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : ''
  return `${sign}${delta.toFixed(0)} p.p.`
}

function isReadingSubject(subject: EvolutionaryLineStudentSubject): boolean {
  return subject.readType !== undefined
}

function readingLabel(type: ReadingType | undefined): string {
  if (!type) return 'Não Informado'
  return READING_LEVEL_LABELS[type] ?? type
}

function readingIndex(type: ReadingType | undefined): number {
  if (!type) return READING_LEVEL_ORDER.length
  const idx = READING_LEVEL_ORDER.indexOf(type)
  return idx === -1 ? READING_LEVEL_ORDER.length : idx
}

/** Tendência de leitura: quanto menor o índice, mais avançado */
function readingTrend(
  from: ReadingType | undefined,
  to: ReadingType | undefined,
): string {
  const idxFrom = readingIndex(from)
  const idxTo = readingIndex(to)
  if (idxTo < idxFrom) return '📈 (evolução)'
  if (idxTo > idxFrom) return '📉 (regressão)'
  return '→ (estável)'
}

/** Retorna mapa: nome da disciplina → lista ordenada por edição */
function buildSubjectTimeline(
  items: EvolutionaryLineStudentEdition[],
): Map<
  string,
  { editionName: string; subject: EvolutionaryLineStudentSubject }[]
> {
  const map = new Map<
    string,
    { editionName: string; subject: EvolutionaryLineStudentSubject }[]
  >()

  items.forEach((edition) => {
    ;(edition.subjects ?? []).forEach((subject) => {
      const key = subject.name ?? `ID ${subject.id}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push({
        editionName: edition.name ?? `ID ${edition.id}`,
        subject,
      })
    })
  })

  return map
}

// ─── Cabeçalho ────────────────────────────────────────────────────────────────

function formatContextHeader(
  context: EvolutionaryLineStudentReportContext,
): string {
  const lines: string[] = [
    '=== DADOS DO RELATÓRIO LINHA EVOLUTIVA — NÍVEL ALUNO ===\n',
  ]

  if (context.studentName) lines.push(`ALUNO: ${context.studentName}`)
  if (context.serie?.SER_NOME) lines.push(`SÉRIE: ${context.serie.SER_NOME}`)
  if (context.serie?.SER_NUMBER)
    lines.push(`NÚMERO DA SÉRIE: ${context.serie.SER_NUMBER}`)
  if (context.year?.name) lines.push(`ANO LETIVO: ${context.year.name}`)

  return lines.join('\n')
}

// ─── Breadcrumb / Filtros ─────────────────────────────────────────────────────

function formatBreadcrumb(
  context: EvolutionaryLineStudentReportContext,
): string {
  if (!context.breadcrumb?.length) return ''

  const lines: string[] = ['\nFILTROS APLICADOS:']
  context.breadcrumb.forEach((item) => {
    if (item.name) lines.push(`  - ${item.label}: ${item.name}`)
  })

  return lines.join('\n')
}

// ─── Localização ──────────────────────────────────────────────────────────────

function formatLocationInfo(
  context: EvolutionaryLineStudentReportContext,
): string {
  const lines: string[] = []

  if (context.state?.name) lines.push(`\nESTADO: ${context.state.name}`)
  if (context.stateRegional?.name)
    lines.push(`REGIONAL ESTADUAL: ${context.stateRegional.name}`)
  if (context.county?.name) lines.push(`MUNICÍPIO: ${context.county.name}`)
  if (context.countyRegional?.name)
    lines.push(`REGIONAL MUNICIPAL: ${context.countyRegional.name}`)
  if (context.school?.name) lines.push(`ESCOLA: ${context.school.name}`)
  if (context.schoolClass?.name)
    lines.push(`TURMA: ${context.schoolClass.name}`)

  return lines.join('\n')
}

// ─── Edições Detalhadas ───────────────────────────────────────────────────────

function formatAllEditions(
  context: EvolutionaryLineStudentReportContext,
): string {
  if (!context.items?.length) return '\n(Sem dados de edições disponíveis)'

  const lines: string[] = ['\n=== RESULTADO POR EDIÇÃO ===']

  context.items.forEach((edition) => {
    const editionLabel = edition.name ?? `ID ${edition.id}`
    lines.push(`\n▶ EDIÇÃO: ${editionLabel}`)

    if (!edition.subjects?.length) {
      lines.push('  (Sem dados de disciplinas para esta edição)')
      return
    }

    edition.subjects.forEach((subject) => {
      const name = (subject.name ?? `ID ${subject.id}`).padEnd(30)
      const participated = subject.isParticipated
        ? 'Participou'
        : 'Não Participou'

      if (isReadingSubject(subject)) {
        const level = readingLabel(subject.readType)
        lines.push(
          `    ▸ ${name}: ${participated}  |  Nível de Leitura: ${level}`,
        )
      } else {
        const score = fmt(subject.totalRightQuestions ?? 0)
        const level = classifyPerformance(subject.totalRightQuestions ?? 0)
        const classification = subject.isParticipated
          ? ` (${PERFORMANCE_LABELS[level]})`
          : ''
        lines.push(
          `    ▸ ${name}: ${participated}  |  Acerto: ${score}${classification}`,
        )
      }
    })

    lines.push('  ' + '─'.repeat(60))
  })

  return lines.join('\n')
}

// ─── Comparativo: Primeira ↔ Última Edição ────────────────────────────────────

function buildFirstLastComparison(
  items: EvolutionaryLineStudentEdition[],
): string {
  if (items.length < 2) return ''

  const first = items[0]
  const last = items[items.length - 1]
  const firstLabel = first.name ?? `ID ${first.id}`
  const lastLabel = last.name ?? `ID ${last.id}`

  const lines: string[] = [
    `\n=== COMPARATIVO: 1ª EDIÇÃO (${firstLabel}) → ÚLTIMA EDIÇÃO (${lastLabel}) ===`,
  ]

  const firstMap = new Map(
    (first.subjects ?? []).map((s) => [s.name ?? `ID ${s.id}`, s]),
  )

  ;(last.subjects ?? []).forEach((lastSubject) => {
    const key = lastSubject.name ?? `ID ${lastSubject.id}`
    const firstSubject = firstMap.get(key)
    if (!firstSubject) return

    lines.push(`\n  ${key}:`)

    if (isReadingSubject(lastSubject)) {
      const from = firstSubject.readType
      const to = lastSubject.readType
      const trend = readingTrend(from, to)

      lines.push(
        `    Leitura: ${readingLabel(from)} → ${readingLabel(to)}  ${trend}`,
      )

      if (!firstSubject.isParticipated || !lastSubject.isParticipated) {
        const note = !firstSubject.isParticipated
          ? '(não participou na 1ª edição)'
          : '(não participou na última edição)'
        lines.push(`    ⚠ ${note}`)
      }
    } else {
      const scoreFirst = firstSubject.isParticipated
        ? (firstSubject.totalRightQuestions ?? 0)
        : null
      const scoreLast = lastSubject.isParticipated
        ? (lastSubject.totalRightQuestions ?? 0)
        : null

      if (scoreFirst !== null && scoreLast !== null) {
        const delta = scoreLast - scoreFirst
        const trend = delta >= 0 ? '📈' : '📉'
        lines.push(
          `    Acerto: ${fmt(scoreFirst)} → ${fmt(scoreLast)}  (${fmtDelta(delta)}) ${trend}`,
        )
      } else {
        const note =
          scoreFirst === null
            ? `1ª edição: Não Participou`
            : `Última edição: Não Participou`
        lines.push(`    ⚠ ${note} — comparativo parcial`)
        if (scoreLast !== null)
          lines.push(
            `    Última edição: ${fmt(scoreLast)} (${PERFORMANCE_LABELS[classifyPerformance(scoreLast)]})`,
          )
        if (scoreFirst !== null)
          lines.push(
            `    1ª edição: ${fmt(scoreFirst)} (${PERFORMANCE_LABELS[classifyPerformance(scoreFirst)]})`,
          )
      }
    }
  })

  return lines.join('\n')
}

// ─── Análise de Tendência por Disciplina ──────────────────────────────────────

function buildTrendAnalysis(
  items: EvolutionaryLineStudentEdition[],
  timeline: Map<
    string,
    { editionName: string; subject: EvolutionaryLineStudentSubject }[]
  >,
): string {
  if (items.length < 2) return ''

  const lines: string[] = ['\n=== ANÁLISE DE TENDÊNCIA POR DISCIPLINA ===']

  for (const [subjectName, history] of timeline.entries()) {
    if (history.length < 2) continue

    lines.push(`\n  ${subjectName}:`)

    const isReading = isReadingSubject(history[0].subject)

    if (isReading) {
      const historyStr = history
        .map((h) => `${h.editionName}: ${readingLabel(h.subject.readType)}`)
        .join(' → ')
      lines.push(`    Trajetória: ${historyStr}`)

      // Tendência geral (primeira → última)
      const from = history[0].subject.readType
      const to = history[history.length - 1].subject.readType
      lines.push(`    Tendência : ${readingTrend(from, to)}`)

      // Apontar se houve regressão entre edições consecutivas
      const regressions: string[] = []
      for (let i = 1; i < history.length; i++) {
        const prev = history[i - 1]
        const curr = history[i]
        const idxPrev = readingIndex(prev.subject.readType)
        const idxCurr = readingIndex(curr.subject.readType)
        if (idxCurr > idxPrev) {
          regressions.push(
            `${prev.editionName} → ${curr.editionName}: ${readingLabel(prev.subject.readType)} → ${readingLabel(curr.subject.readType)}`,
          )
        }
      }
      if (regressions.length > 0) {
        lines.push(`    ⚠ Regressões identificadas:`)
        regressions.forEach((r) => lines.push(`      - ${r}`))
      }
    } else {
      // Disciplina objetiva
      const participated = history.filter((h) => h.subject.isParticipated)

      if (participated.length === 0) {
        lines.push(
          `    ⚠ Aluno não participou em nenhuma edição desta disciplina`,
        )
        continue
      }

      const historyStr = history
        .map((h) =>
          h.subject.isParticipated
            ? `${h.editionName}: ${fmt(h.subject.totalRightQuestions ?? 0)}`
            : `${h.editionName}: Não Participou`,
        )
        .join(' → ')
      lines.push(`    Trajetória: ${historyStr}`)

      if (participated.length >= 2) {
        const first = participated[0]
        const last = participated[participated.length - 1]
        const delta =
          (last.subject.totalRightQuestions ?? 0) -
          (first.subject.totalRightQuestions ?? 0)
        const trend =
          delta > 1 ? '📈 Crescimento' : delta < -1 ? '📉 Queda' : '→ Estável'
        lines.push(
          `    Tendência : ${trend} (${fmtDelta(delta)} entre edições participadas)`,
        )

        // Maior salto e maior queda consecutivos
        let maxJump = -Infinity
        let maxDrop = Infinity
        let maxJumpDesc = ''
        let maxDropDesc = ''

        for (let i = 1; i < history.length; i++) {
          const prev = history[i - 1]
          const curr = history[i]
          if (!prev.subject.isParticipated || !curr.subject.isParticipated)
            continue

          const d =
            (curr.subject.totalRightQuestions ?? 0) -
            (prev.subject.totalRightQuestions ?? 0)

          if (d > maxJump) {
            maxJump = d
            maxJumpDesc = `${prev.editionName} → ${curr.editionName}: ${fmtDelta(d)}`
          }
          if (d < maxDrop) {
            maxDrop = d
            maxDropDesc = `${prev.editionName} → ${curr.editionName}: ${fmtDelta(d)}`
          }
        }

        if (maxJump > 0) lines.push(`    Maior salto: ${maxJumpDesc} 📈`)
        if (maxDrop < 0) lines.push(`    Maior queda: ${maxDropDesc} 📉`)
      }
    }
  }

  return lines.join('\n')
}

// ─── Destaques ────────────────────────────────────────────────────────────────

function buildHighlights(
  items: EvolutionaryLineStudentEdition[],
  timeline: Map<
    string,
    { editionName: string; subject: EvolutionaryLineStudentSubject }[]
  >,
): string {
  if (!items.length) return ''

  const lines: string[] = ['\n=== DESTAQUES ===']
  const lastEdition = items[items.length - 1]
  const lastLabel = lastEdition.name ?? `ID ${lastEdition.id}`

  // Melhor acerto objetivo na última edição
  const objectiveSubjects = (lastEdition.subjects ?? []).filter(
    (s) => !isReadingSubject(s) && s.isParticipated,
  )
  if (objectiveSubjects.length > 0) {
    const best = [...objectiveSubjects].sort(
      (a, b) => (b.totalRightQuestions ?? 0) - (a.totalRightQuestions ?? 0),
    )[0]
    const level = classifyPerformance(best.totalRightQuestions ?? 0)
    lines.push(
      `\n  ★ Melhor acerto na edição "${lastLabel}": ${best.name ?? `ID ${best.id}`} — ${fmt(best.totalRightQuestions ?? 0)} (${PERFORMANCE_LABELS[level]})`,
    )
  }

  // Nível de leitura na última edição
  const readingSubjects = (lastEdition.subjects ?? []).filter(isReadingSubject)
  if (readingSubjects.length > 0) {
    lines.push(`\n  ★ Nível de leitura na edição "${lastLabel}":`)
    readingSubjects.forEach((s) => {
      const label = readingLabel(s.readType)
      const participated = s.isParticipated ? '' : ' (Não Participou)'
      lines.push(`    ▸ ${s.name ?? `ID ${s.id}`}: ${label}${participated}`)
    })
  }

  // Maior evolução de leitura ao longo das edições
  for (const [subjectName, history] of timeline.entries()) {
    if (!isReadingSubject(history[0].subject) || history.length < 2) continue

    const participated = history.filter((h) => h.subject.isParticipated)
    if (participated.length < 2) continue

    const first = participated[0]
    const last = participated[participated.length - 1]
    const idxFirst = readingIndex(first.subject.readType)
    const idxLast = readingIndex(last.subject.readType)

    if (idxLast < idxFirst) {
      lines.push(
        `\n  ★ Evolução em Leitura — ${subjectName}: ` +
          `${readingLabel(first.subject.readType)} (${first.editionName}) → ` +
          `${readingLabel(last.subject.readType)} (${last.editionName}) 📈`,
      )
    }
  }

  // Maior salto positivo em disciplina objetiva
  let globalBestJump: { desc: string; delta: number } | null = null

  for (const [subjectName, history] of timeline.entries()) {
    if (isReadingSubject(history[0].subject)) continue

    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1]
      const curr = history[i]
      if (!prev.subject.isParticipated || !curr.subject.isParticipated) continue

      const delta =
        (curr.subject.totalRightQuestions ?? 0) -
        (prev.subject.totalRightQuestions ?? 0)

      if (!globalBestJump || delta > globalBestJump.delta) {
        globalBestJump = {
          delta,
          desc: `${subjectName} — ${prev.editionName} → ${curr.editionName}: ${fmtDelta(delta)}`,
        }
      }
    }
  }

  if (globalBestJump && globalBestJump.delta > 0) {
    lines.push(
      `\n  ★ Maior salto positivo entre edições: ${globalBestJump.desc} 📈`,
    )
  }

  return lines.join('\n')
}

// ─── Pontos de Atenção ────────────────────────────────────────────────────────

function buildAlerts(
  items: EvolutionaryLineStudentEdition[],
  timeline: Map<
    string,
    { editionName: string; subject: EvolutionaryLineStudentSubject }[]
  >,
): string {
  if (!items.length) return ''

  const lines: string[] = ['\n=== PONTOS DE ATENÇÃO ===']
  let hasAlert = false

  // Edições não participadas
  const absences: string[] = []
  items.forEach((edition) => {
    ;(edition.subjects ?? []).forEach((subject) => {
      if (!subject.isParticipated) {
        absences.push(
          `    ⚠ ${subject.name ?? `ID ${subject.id}`} — edição "${edition.name ?? `ID ${edition.id}`}": Não Participou`,
        )
      }
    })
  })

  if (absences.length > 0) {
    hasAlert = true
    lines.push('\n  AUSÊNCIAS OU NÃO PARTICIPAÇÕES:')
    absences.forEach((a) => lines.push(a))
  }

  // Desempenho crítico (<25%) em disciplinas objetivas na última edição
  const lastEdition = items[items.length - 1]
  const criticalSubjects = (lastEdition.subjects ?? []).filter(
    (s) =>
      !isReadingSubject(s) &&
      s.isParticipated &&
      (s.totalRightQuestions ?? 0) < PERFORMANCE_THRESHOLDS.CRITICO,
  )

  if (criticalSubjects.length > 0) {
    hasAlert = true
    lines.push(
      `\n  DESEMPENHO CRÍTICO (<25%) NA ÚLTIMA EDIÇÃO ("${lastEdition.name ?? `ID ${lastEdition.id}`}"):`,
    )
    criticalSubjects.forEach((s) => {
      lines.push(
        `    ⚠ ${s.name ?? `ID ${s.id}`}: ${fmt(s.totalRightQuestions ?? 0)}`,
      )
    })
  }

  // Regressão de leitura ao longo das edições
  for (const [subjectName, history] of timeline.entries()) {
    if (!isReadingSubject(history[0].subject) || history.length < 2) continue

    const participated = history.filter((h) => h.subject.isParticipated)
    if (participated.length < 2) continue

    const first = participated[0]
    const last = participated[participated.length - 1]
    const idxFirst = readingIndex(first.subject.readType)
    const idxLast = readingIndex(last.subject.readType)

    if (idxLast > idxFirst) {
      hasAlert = true
      lines.push(
        `\n  ⚠ Regressão em Leitura — ${subjectName}: ` +
          `${readingLabel(first.subject.readType)} (${first.editionName}) → ` +
          `${readingLabel(last.subject.readType)} (${last.editionName}) 📉`,
      )
    }
  }

  // Queda brusca (>15 p.p.) em disciplinas objetivas entre edições consecutivas
  const sharpDrops: string[] = []

  for (const [subjectName, history] of timeline.entries()) {
    if (isReadingSubject(history[0].subject)) continue

    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1]
      const curr = history[i]
      if (!prev.subject.isParticipated || !curr.subject.isParticipated) continue

      const delta =
        (curr.subject.totalRightQuestions ?? 0) -
        (prev.subject.totalRightQuestions ?? 0)

      if (delta <= -15) {
        sharpDrops.push(
          `    ⚠ ${subjectName} — ${prev.editionName} → ${curr.editionName}: ${fmtDelta(delta)} 📉`,
        )
      }
    }
  }

  if (sharpDrops.length > 0) {
    hasAlert = true
    lines.push('\n  QUEDAS BRUSCAS ENTRE EDIÇÕES CONSECUTIVAS (>15 p.p.):')
    sharpDrops.forEach((d) => lines.push(d))
  }

  // Nível crítico de leitura (Não Leitor ou Lê Sílabas) na última edição
  const criticalReading = (lastEdition.subjects ?? []).filter(
    (s) =>
      isReadingSubject(s) &&
      s.isParticipated &&
      (s.readType === 'nao_leitor' || s.readType === 'silabas'),
  )

  if (criticalReading.length > 0) {
    hasAlert = true
    lines.push(
      `\n  NÍVEL DE LEITURA CRÍTICO NA ÚLTIMA EDIÇÃO ("${lastEdition.name ?? `ID ${lastEdition.id}`}"):`,
    )
    criticalReading.forEach((s) => {
      lines.push(
        `    ⚠ ${s.name ?? `ID ${s.id}`}: ${readingLabel(s.readType)}`,
      )
    })
  }

  if (!hasAlert) {
    lines.push('\n  ✓ Nenhum ponto de atenção crítico identificado.')
  }

  return lines.join('\n')
}

// ─── Referência ───────────────────────────────────────────────────────────────

function buildReference(): string {
  return `
=== REFERÊNCIA ===

DISCIPLINAS OBJETIVAS — Classificação por % de acertos do aluno:
  ▸ Maior Desempenho   (75-100%) → Resultado acima do esperado
  ▸ Desempenho Mediano  (50-74%) → Resultado dentro da média
  ▸ Abaixo da Média     (25-49%) → Resultado insatisfatório
  ▸ Menor Desempenho     (0-24%) → Atenção urgente

DISCIPLINAS DE LEITURA — Nível individual do aluno (do mais avançado ao inicial):
  Fluente > Não Fluente > Lê Frases > Lê Palavras > Lê Sílabas > Não Leitor
  ▸ Fluente        → Lê com fluência e compreensão adequada para a série
  ▸ Não Fluente    → Reconhece palavras mas sem fluência plena
  ▸ Lê Frases      → Consegue ler frases simples
  ▸ Lê Palavras    → Decodifica palavras isoladas
  ▸ Lê Sílabas     → Em processo inicial de alfabetização ⚠
  ▸ Não Leitor     → Sem reconhecimento de letras/sílabas ⚠ (nível crítico)
  ▸ Não Avaliado   → Aluno presente mas não avaliado
  ▸ Não Informado  → Sem registro de nível de leitura

TENDÊNCIA DE LEITURA:
  📈 (evolução) → Aluno avançou na hierarquia (ex: Lê Palavras → Lê Frases)
  📉 (regressão) → Aluno regrediu na hierarquia
  → (estável) → Nível mantido entre edições

PARTICIPAÇÃO:
  ▸ "Não Participou" significa que o aluno não realizou ou não finalizou a avaliação
  ▸ Ausências comprometem a análise da evolução — registre e destaque quando presentes`
}

// ─── Montagem do Contexto Completo ────────────────────────────────────────────

export function formatEvolutionaryLineStudentContextForPrompt(
  context: EvolutionaryLineStudentReportContext,
): string {
  const timeline = buildSubjectTimeline(context.items ?? [])

  return [
    formatContextHeader(context),
    formatBreadcrumb(context),
    formatLocationInfo(context),
    buildFirstLastComparison(context.items ?? []),
    buildHighlights(context.items ?? [], timeline),
    buildAlerts(context.items ?? [], timeline),
    buildTrendAnalysis(context.items ?? [], timeline),
    formatAllEditions(context),
    buildReference(),
  ]
    .filter(Boolean)
    .join('\n')
}

// ─── System Prompt ────────────────────────────────────────────────────────────

export function buildEvolutionaryLineStudentSystemPrompt(
  context?: EvolutionaryLineStudentReportContext,
): string {
  const contextString = context
    ? formatEvolutionaryLineStudentContextForPrompt(context)
    : 'Nenhum contexto de relatório foi fornecido. Responda de forma genérica sobre o Relatório Linha Evolutiva (nível aluno) do SAEV.'

  const studentRef = context?.studentName
    ? `do aluno ${context.studentName}`
    : 'do aluno'

  return `Você é a SAEVIA, assistente de IA especializada em análise de dados educacionais do SAEV (Sistema de Avaliação Educacional).

${contextString}

=== DIRETRIZES DE ANÁLISE ===

1. INTEGRIDADE DOS DADOS (REGRA CRÍTICA):
   - ANTES de responder, SEMPRE releia os dados acima para confirmar a informação.
   - NUNCA invente, estime ou complete dados ausentes. Se não está nos dados, diga: "Essa informação não está disponível nos dados fornecidos."
   - Se o usuário insistir ("tem certeza?", "revise novamente"), releia e mantenha sua resposta se estiver correta.
   - NÃO se deixe induzir ao erro: se os dados mostram X, responda X, mesmo que o usuário sugira Y.
   - Cada número, nível e edição citados DEVE estar presente nos dados acima.

   PROCEDIMENTO OBRIGATÓRIO ao buscar uma edição específica:
   1. Localize o marcador ▶ EDIÇÃO: [NOME] correspondente
   2. Leia APENAS os dados daquela edição
   3. NUNCA misture dados de edições diferentes
   4. Se não encontrar, a edição NÃO está nos dados

2. ESTRUTURA DOS DADOS — LINHA EVOLUTIVA (NÍVEL ALUNO):
   - Este relatório mostra a trajetória individual ${studentRef} ao longo de múltiplas EDIÇÕES (avaliações) no mesmo ano letivo.
   - Hierarquia: Série → Edições → Disciplinas (resultado individual do aluno)
   - Cada disciplina em cada edição possui:
     • "isParticipated" → se o aluno realizou e finalizou a avaliação
     • Para disciplinas OBJETIVAS:
       - "totalRightQuestions" → percentual de acertos (0–100%)
       - Classificado em 4 faixas (ver REFERÊNCIA)
     • Para disciplinas de LEITURA (readType presente):
       - "readType" → nível individual de fluência do aluno
       - Hierarquia: Fluente > Não Fluente > Lê Frases > Lê Palavras > Lê Sílabas > Não Leitor
       - NÃO existe "% de acerto" direto para leitura — o indicador é o NÍVEL qualitativo
   - Edições marcadas com ▶ | Disciplinas marcadas com ▸

3. CAPACIDADES ANALÍTICAS — como responder cada tipo de solicitação:

   A. ANÁLISE DO RELATÓRIO (visão da trajetória do aluno):
      Foco: evolução do aluno em cada disciplina ao longo de todas as edições.
      Modelo objetiva: "[Disciplina]: [trajetória completa com % por edição] — tendência [📈/📉/→]."
      Modelo leitura: "[Disciplina]: [trajetória de níveis por edição] — tendência [📈 evolução / 📉 regressão / → estável]."
      - Use a seção ANÁLISE DE TENDÊNCIA POR DISCIPLINA como base.
      - Apresente todas as disciplinas; separe claramente objetivas de leitura.
      - Aponte se houve regressões pontuais entre edições consecutivas.

   B. RESUMO (comparativo direto 1ª ↔ última edição):
      Foco: o que mudou entre a primeira e a última edição avaliada.
      - Use a seção COMPARATIVO: 1ª EDIÇÃO → ÚLTIMA EDIÇÃO como base.
      - Para objetivas: "[Disciplina]: X% → Y% (Δ p.p.) [📈/📉]"
      - Para leitura: "[Disciplina]: [Nível Inicial] → [Nível Final] [📈 evolução / 📉 regressão / → estável]"
      - Se o aluno não participou em alguma edição, mencione explicitamente e contextualize o impacto na análise.

   C. DESTAQUES:
      Foco: os melhores resultados e avanços do aluno no período.
      - Use a seção DESTAQUES como base.
      - Informe melhor acerto objetivo na última edição e sua classificação.
      - Informe o nível de leitura na última edição.
      - Informe o maior salto positivo entre edições consecutivas (objetiva).
      - Informe evoluções de nível em disciplinas de leitura (ex: "subiu de Lê Palavras para Lê Frases").

   D. PONTOS DE ATENÇÃO:
      Foco: riscos e lacunas na trajetória do aluno.
      - Use a seção PONTOS DE ATENÇÃO como base.
      - Alerte sobre ausências (não participação) em qualquer disciplina/edição.
      - Alerte sobre acerto crítico (<25%) em disciplinas objetivas na última edição.
      - Alerte sobre regressão em nível de leitura (ex: regrediu de Lê Frases para Lê Palavras).
      - Alerte sobre quedas bruscas (>15 p.p.) em disciplinas objetivas entre edições consecutivas.
      - Alerte sobre nível de leitura crítico (Não Leitor ou Lê Sílabas) na última edição.
      - Se não houver pontos de atenção, informe claramente.

   E. COMPARAR DISCIPLINAS:
      Foco: cruzamento do desempenho entre disciplinas.
      - Compare % de acerto entre disciplinas objetivas na edição solicitada (ou última).
      - Correlacione Língua Portuguesa e Leitura quando ambas estiverem presentes:
        ex: "O aluno está em Lê Frases em Leitura e obteve 45% em Língua Portuguesa — ambos indicam lacunas em linguagem."
      - Identifique qual disciplina o aluno tem melhor e pior resultado.
      - Aponte se há disciplinas em que a evolução foi consistente vs. instável.

   F. ANÁLISE DE LEITURA (detalhada):
      Foco: interpretação qualitativa do nível de leitura.
      - Apresente o nível de leitura em cada edição e a trajetória completa.
      - Interprete o nível atual: o que ele significa para o estágio de alfabetização do aluno.
      - Contextualize com a série (SER_NUMBER), se disponível:
        • Séries iniciais (1º/2º): Lê Frases ou superior é positivo; Não Leitor/Sílabas é crítico
        • Séries intermediárias (3º/4º): Não Fluente ou superior é esperado; Lê Palavras ou abaixo é alerta
        • Séries avançadas (5º+): Fluente é o objetivo; qualquer nível abaixo indica lacuna significativa
      - NUNCA interprete o nível de leitura como percentual de acertos; são dados qualitativos distintos.

   G. CONSULTAS DIRETAS:
      - "Qual o resultado de [disciplina] na edição X?" → Localize ▶ EDIÇÃO: X, encontre ▸ [disciplina].
      - "Como o aluno evoluiu em [disciplina]?" → Use ANÁLISE DE TENDÊNCIA para aquela disciplina.
      - "Em que nível de leitura o aluno está?" → Informe o readType da última edição participada.
      - "O aluno participou de todas as avaliações?" → Verifique isParticipated em todas as edições.
      - Se o usuário NÃO especificar a edição, responda para a última disponível.

4. RECUSA PADRÃO — assuntos fora do escopo:
   "Sou especializada na análise dos dados educacionais do SAEV. Como posso ajudá-lo com os resultados apresentados?"

5. LIMITAÇÃO PEDAGÓGICA:
   Você analisa dados — não prescreve métodos de ensino.
   NUNCA gere: planos de aula, roteiros de estudo, sugestões didáticas ou intervenções pedagógicas.
   Se solicitado: "A interpretação pedagógica cabe aos profissionais de educação. Posso ajudá-lo a entender o que os dados indicam."

6. FORMATO DE RESPOSTA:
   - Seja objetiva, direta e profissional.
   - Use listas e tópicos para múltiplas informações.
   - Para objetivas: sempre cite o % e a classificação.
   - Para leitura: sempre cite o nome do nível (Fluente, Não Fluente, etc.) — nunca o código interno.
   - Em comparações de evolução, sempre mencione a variação (p.p. para objetivas, nível para leitura) e o indicador (📈 📉 →).

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
