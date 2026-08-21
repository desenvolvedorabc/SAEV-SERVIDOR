import {
  EvolutionaryLineEdition,
  EvolutionaryLineReportContext,
  EvolutionaryLineSubject,
} from '../model/interface/report-context.interface'

// ─── Classificação de Desempenho ──────────────────────────────────────────────

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
  critico: 'Menor Desempenho (0-24%)',
  abaixo: 'Abaixo da Média (25-49%)',
  mediano: 'Desempenho Mediano (50-74%)',
  bom: 'Maior Desempenho (75-100%)',
}

// ─── Tendência ────────────────────────────────────────────────────────────────

type Tendency = 'ascendente' | 'descendente' | 'estavel' | 'irregular'

function classifyTendency(deltas: number[]): Tendency {
  if (deltas.length === 0) return 'estavel'
  const positives = deltas.filter((d) => d > 1).length
  const negatives = deltas.filter((d) => d < -1).length
  if (positives === deltas.length) return 'ascendente'
  if (negatives === deltas.length) return 'descendente'
  if (positives === 0 && negatives === 0) return 'estavel'
  return 'irregular'
}

const TENDENCY_LABELS: Record<Tendency, string> = {
  ascendente: '↑ Ascendente (crescimento consistente)',
  descendente: '↓ Descendente (queda consistente)',
  estavel: '→ Estável (sem variação significativa)',
  irregular: '⇅ Irregular (oscilação entre edições)',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(value: number): string {
  return `${Number(value).toFixed(1)}%`
}

function fmtDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : ''
  return `${sign}${delta.toFixed(1)} p.p.`
}

function subjectKey(s: EvolutionaryLineSubject): string {
  return s.name ?? `ID ${s.id}`
}

/** Retorna mapa: nome da disciplina → lista ordenada de (edição, dados) */
function buildSubjectTimeline(
  items: EvolutionaryLineEdition[],
): Map<string, { editionName: string; subject: EvolutionaryLineSubject }[]> {
  const map = new Map<
    string,
    { editionName: string; subject: EvolutionaryLineSubject }[]
  >()

  items.forEach((edition) => {
    ;(edition.subjects ?? []).forEach((subject) => {
      const key = subjectKey(subject)
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

function formatContextHeader(context: EvolutionaryLineReportContext): string {
  const lines: string[] = ['=== DADOS DO RELATÓRIO LINHA EVOLUTIVA ===\n']

  if (context.serie?.SER_NOME) lines.push(`SÉRIE: ${context.serie.SER_NOME}`)
  if (context.year?.name) lines.push(`ANO LETIVO: ${context.year.name}`)

  return lines.join('\n')
}

// ─── Breadcrumb / Filtros ─────────────────────────────────────────────────────

function formatBreadcrumb(context: EvolutionaryLineReportContext): string {
  if (!context.breadcrumb?.length) return ''

  const lines: string[] = ['\nFILTROS APLICADOS:']
  context.breadcrumb.forEach((item) => {
    if (item.name) lines.push(`  - ${item.label}: ${item.name}`)
  })

  return lines.join('\n')
}

// ─── Localização ──────────────────────────────────────────────────────────────

function formatLocationInfo(context: EvolutionaryLineReportContext): string {
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

function formatAllEditions(context: EvolutionaryLineReportContext): string {
  if (!context.items?.length) return '\n(Sem dados de edições disponíveis)'

  const lines: string[] = ['\n=== EDIÇÕES AVALIADAS ===']

  context.items.forEach((edition) => {
    const editionLabel = edition.name ?? `ID ${edition.id}`
    lines.push(`\n▶ EDIÇÃO: ${editionLabel}`)

    if (!edition.subjects?.length) {
      lines.push('  (Sem dados de disciplinas para esta edição)')
      return
    }

    lines.push('  DESEMPENHO POR DISCIPLINA:')
    edition.subjects.forEach((subject) => {
      const name = subjectKey(subject).padEnd(30)
      const score = fmt(subject.percentageRightQuestions ?? 0).padStart(6)
      const participation = fmt(subject.percentageFinished ?? 0).padStart(6)
      const launched = subject.countLaunched ?? 0
      const total = subject.totalStudents ?? 0
      const level = classifyPerformance(subject.percentageRightQuestions ?? 0)

      lines.push(
        `    ▸ ${name}: ${score} de acerto (${PERFORMANCE_LABELS[level]})` +
          `  |  participação: ${participation} (${launched}/${total} alunos)`,
      )
    })

    lines.push('  ' + '─'.repeat(60))
  })

  return lines.join('\n')
}

// ─── Comparativo: Primeira ↔ Última Edição ────────────────────────────────────

function buildFirstLastComparison(items: EvolutionaryLineEdition[]): string {
  if (items.length < 2) return ''

  const first = items[0]
  const last = items[items.length - 1]
  const firstLabel = first.name ?? `ID ${first.id}`
  const lastLabel = last.name ?? `ID ${last.id}`

  const lines: string[] = [
    `\n=== COMPARATIVO: 1ª EDIÇÃO (${firstLabel}) → ÚLTIMA EDIÇÃO (${lastLabel}) ===`,
  ]

  const firstMap = new Map(
    (first.subjects ?? []).map((s) => [subjectKey(s), s]),
  )

  let overallDeltaSum = 0
  let overallCount = 0

  ;(last.subjects ?? []).forEach((lastSubject) => {
    const key = subjectKey(lastSubject)
    const firstSubject = firstMap.get(key)
    if (!firstSubject) return

    const scoreFirst = firstSubject.percentageRightQuestions ?? 0
    const scoreLast = lastSubject.percentageRightQuestions ?? 0
    const partFirst = firstSubject.percentageFinished ?? 0
    const partLast = lastSubject.percentageFinished ?? 0
    const scoreDelta = scoreLast - scoreFirst
    const partDelta = partLast - partFirst
    const trend = scoreDelta >= 0 ? '📈' : '📉'

    lines.push(
      `\n  ${key}:` +
        `\n    Acerto      : ${fmt(scoreFirst)} → ${fmt(scoreLast)}  (${fmtDelta(scoreDelta)}) ${trend}` +
        `\n    Participação: ${fmt(partFirst)} → ${fmt(partLast)}  (${fmtDelta(partDelta)})`,
    )

    overallDeltaSum += scoreDelta
    overallCount++
  })

  if (overallCount > 0) {
    const avgDelta = overallDeltaSum / overallCount
    const overallTrend = avgDelta >= 0 ? '📈' : '📉'
    lines.push(
      `\n  VARIAÇÃO GERAL MÉDIA: ${fmtDelta(avgDelta)} ${overallTrend}`,
    )
  }

  return lines.join('\n')
}

// ─── Análise de Tendência por Disciplina ──────────────────────────────────────

function buildTrendAnalysis(
  items: EvolutionaryLineEdition[],
  timeline: Map<
    string,
    { editionName: string; subject: EvolutionaryLineSubject }[]
  >,
): string {
  if (items.length < 2) return ''

  const lines: string[] = ['\n=== ANÁLISE DE TENDÊNCIA POR DISCIPLINA ===']

  for (const [subjectName, history] of timeline.entries()) {
    if (history.length < 2) continue

    const deltas: number[] = []
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1].subject.percentageRightQuestions ?? 0
      const curr = history[i].subject.percentageRightQuestions ?? 0
      deltas.push(curr - prev)
    }

    const tendency = classifyTendency(deltas)
    const first = history[0]
    const last = history[history.length - 1]
    const totalDelta =
      (last.subject.percentageRightQuestions ?? 0) -
      (first.subject.percentageRightQuestions ?? 0)

    lines.push(`\n  ${subjectName}:`)
    lines.push(`    Tendência   : ${TENDENCY_LABELS[tendency]}`)
    lines.push(
      `    Variação    : ${fmt(first.subject.percentageRightQuestions ?? 0)} → ${fmt(last.subject.percentageRightQuestions ?? 0)}  (${fmtDelta(totalDelta)})`,
    )

    const historyStr = history
      .map(
        (h) =>
          `${h.editionName}: ${fmt(h.subject.percentageRightQuestions ?? 0)}`,
      )
      .join(' → ')
    lines.push(`    Trajetória  : ${historyStr}`)

    // Maior salto positivo e negativo consecutivos
    let maxJump = -Infinity
    let maxDrop = Infinity
    let maxJumpDesc = ''
    let maxDropDesc = ''

    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1]
      const curr = history[i]
      const delta =
        (curr.subject.percentageRightQuestions ?? 0) -
        (prev.subject.percentageRightQuestions ?? 0)

      if (delta > maxJump) {
        maxJump = delta
        maxJumpDesc = `${prev.editionName} → ${curr.editionName}: ${fmtDelta(delta)}`
      }
      if (delta < maxDrop) {
        maxDrop = delta
        maxDropDesc = `${prev.editionName} → ${curr.editionName}: ${fmtDelta(delta)}`
      }
    }

    if (maxJump > 0) lines.push(`    Maior salto : ${maxJumpDesc} 📈`)
    if (maxDrop < 0) lines.push(`    Maior queda : ${maxDropDesc} 📉`)
  }

  return lines.join('\n')
}

// ─── Destaques ────────────────────────────────────────────────────────────────

function buildHighlights(
  items: EvolutionaryLineEdition[],
  timeline: Map<
    string,
    { editionName: string; subject: EvolutionaryLineSubject }[]
  >,
): string {
  if (!items.length) return ''

  const lines: string[] = ['\n=== DESTAQUES ===']
  const lastEdition = items[items.length - 1]

  // Melhor acerto na última edição
  const byScore = [...(lastEdition.subjects ?? [])].sort(
    (a, b) =>
      (b.percentageRightQuestions ?? 0) - (a.percentageRightQuestions ?? 0),
  )
  if (byScore.length > 0) {
    lines.push(
      `\n  ★ Melhor acerto na edição "${lastEdition.name ?? `ID ${lastEdition.id}`}":`,
    )
    byScore.forEach((s) => {
      const level = classifyPerformance(s.percentageRightQuestions ?? 0)
      lines.push(
        `    ▸ ${subjectKey(s)}: ${fmt(s.percentageRightQuestions ?? 0)} (${PERFORMANCE_LABELS[level]})`,
      )
    })
  }

  // Maior participação na última edição
  const byParticipation = [...(lastEdition.subjects ?? [])].sort(
    (a, b) => (b.percentageFinished ?? 0) - (a.percentageFinished ?? 0),
  )
  if (byParticipation.length > 0) {
    lines.push(
      `\n  ★ Maior participação na edição "${lastEdition.name ?? `ID ${lastEdition.id}`}":`,
    )
    byParticipation.forEach((s) => {
      lines.push(
        `    ▸ ${subjectKey(s)}: ${fmt(s.percentageFinished ?? 0)} (${s.countLaunched ?? 0}/${s.totalStudents ?? 0} alunos)`,
      )
    })
  }

  // Maior salto positivo entre edições consecutivas (qualquer disciplina)
  let globalBestJump: { desc: string; delta: number } | null = null

  for (const [subjectName, history] of timeline.entries()) {
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1]
      const curr = history[i]
      const delta =
        (curr.subject.percentageRightQuestions ?? 0) -
        (prev.subject.percentageRightQuestions ?? 0)

      if (!globalBestJump || delta > globalBestJump.delta) {
        globalBestJump = {
          delta,
          desc: `${subjectName} — ${prev.editionName} → ${curr.editionName}: ${fmtDelta(delta)}`,
        }
      }
    }
  }

  if (globalBestJump && globalBestJump.delta > 0) {
    lines.push(`\n  ★ Maior salto positivo entre edições consecutivas:`)
    lines.push(`    ▸ ${globalBestJump.desc} 📈`)
  }

  return lines.join('\n')
}

// ─── Pontos de Atenção ────────────────────────────────────────────────────────

function buildAlerts(
  items: EvolutionaryLineEdition[],
  timeline: Map<
    string,
    { editionName: string; subject: EvolutionaryLineSubject }[]
  >,
): string {
  if (!items.length) return ''

  const lines: string[] = ['\n=== PONTOS DE ATENÇÃO ===']
  let hasAlert = false

  // Quedas bruscas entre edições consecutivas (> 5 p.p.)
  const sharpDrops: string[] = []

  for (const [subjectName, history] of timeline.entries()) {
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1]
      const curr = history[i]
      const delta =
        (curr.subject.percentageRightQuestions ?? 0) -
        (prev.subject.percentageRightQuestions ?? 0)

      if (delta <= -5) {
        sharpDrops.push(
          `    ⚠ ${subjectName} — ${prev.editionName} → ${curr.editionName}: ${fmtDelta(delta)} 📉`,
        )
      }
    }
  }

  if (sharpDrops.length > 0) {
    hasAlert = true
    lines.push('\n  QUEDAS BRUSCAS ENTRE EDIÇÕES CONSECUTIVAS (>5 p.p.):')
    sharpDrops.forEach((l) => lines.push(l))
  }

  // Participação crítica (< 60%) em qualquer edição
  const lowParticipation: string[] = []

  items.forEach((edition) => {
    ;(edition.subjects ?? []).forEach((subject) => {
      if ((subject.percentageFinished ?? 0) < 60) {
        lowParticipation.push(
          `    ⚠ ${subjectKey(subject)} na edição "${edition.name ?? `ID ${edition.id}`}": ` +
            `${fmt(subject.percentageFinished ?? 0)} (${subject.countLaunched ?? 0}/${subject.totalStudents ?? 0} alunos)`,
        )
      }
    })
  })

  if (lowParticipation.length > 0) {
    hasAlert = true
    lines.push('\n  PARTICIPAÇÃO CRÍTICA (<60%):')
    lowParticipation.forEach((l) => lines.push(l))
  }

  // Acerto crítico (< 25%) na última edição
  const lastEdition = items[items.length - 1]
  const criticalScore = (lastEdition.subjects ?? []).filter(
    (s) => (s.percentageRightQuestions ?? 0) < PERFORMANCE_THRESHOLDS.CRITICO,
  )

  if (criticalScore.length > 0) {
    hasAlert = true
    lines.push(
      `\n  DESEMPENHO CRÍTICO (<25%) NA ÚLTIMA EDIÇÃO ("${lastEdition.name ?? `ID ${lastEdition.id}`}"):`,
    )
    criticalScore.forEach((s) => {
      lines.push(
        `    ⚠ ${subjectKey(s)}: ${fmt(s.percentageRightQuestions ?? 0)}`,
      )
    })
  }

  // Queda de participação entre edições (tendência)
  for (const [subjectName, history] of timeline.entries()) {
    const partDeltas = []
    for (let i = 1; i < history.length; i++) {
      const delta =
        (history[i].subject.percentageFinished ?? 0) -
        (history[i - 1].subject.percentageFinished ?? 0)
      partDeltas.push(delta)
    }

    const partTendency = classifyTendency(partDeltas)
    if (partTendency === 'descendente') {
      hasAlert = true
      const first = history[0]
      const last = history[history.length - 1]
      lines.push(
        `\n  ⚠ Participação em queda consistente — ${subjectName}: ` +
          `${fmt(first.subject.percentageFinished ?? 0)} → ${fmt(last.subject.percentageFinished ?? 0)}`,
      )
    }
  }

  if (!hasAlert) {
    lines.push('\n  ✓ Nenhum ponto de atenção crítico identificado.')
  }

  return lines.join('\n')
}

// ─── Correlação Participação × Resultado ─────────────────────────────────────

function buildParticipationCorrelation(
  timeline: Map<
    string,
    { editionName: string; subject: EvolutionaryLineSubject }[]
  >,
): string {
  const lines: string[] = ['\n=== CORRELAÇÃO PARTICIPAÇÃO × RESULTADO ===']
  let hasContent = false

  for (const [subjectName, history] of timeline.entries()) {
    if (history.length < 2) continue

    const correlations: string[] = []

    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1]
      const curr = history[i]

      const scoreDelta =
        (curr.subject.percentageRightQuestions ?? 0) -
        (prev.subject.percentageRightQuestions ?? 0)
      const partDelta =
        (curr.subject.percentageFinished ?? 0) -
        (prev.subject.percentageFinished ?? 0)

      const scoreDir = scoreDelta > 1 ? '↑' : scoreDelta < -1 ? '↓' : '→'
      const partDir = partDelta > 1 ? '↑' : partDelta < -1 ? '↓' : '→'

      let interpretation = ''
      if (scoreDir === '↑' && partDir === '↑') {
        interpretation =
          'Mais alunos avaliados e melhora no resultado — crescimento sólido'
      } else if (scoreDir === '↑' && partDir === '↓') {
        interpretation =
          'Acerto melhorou com menos alunos avaliados — resultado pode estar inflado pela menor amostra'
      } else if (scoreDir === '↓' && partDir === '↑') {
        interpretation =
          'Mais alunos avaliados porém queda no acerto — possível diluição por novos participantes ou dificuldade real'
      } else if (scoreDir === '↓' && partDir === '↓') {
        interpretation =
          'Menos participação e queda no acerto — cenário de atenção dupla'
      } else if (scoreDir === '→' && partDir === '↓') {
        interpretation =
          'Resultado estável com menos alunos — base de amostragem reduzida'
      } else {
        interpretation = 'Sem variação expressiva'
      }

      correlations.push(
        `      ${prev.editionName} → ${curr.editionName}: ` +
          `acerto ${scoreDir} ${fmtDelta(scoreDelta)} | participação ${partDir} ${fmtDelta(partDelta)}` +
          `\n        → ${interpretation}`,
      )
    }

    if (correlations.length > 0) {
      hasContent = true
      lines.push(`\n  ${subjectName}:`)
      correlations.forEach((c) => lines.push(c))
    }
  }

  if (!hasContent) {
    lines.push(
      '\n  (Dados insuficientes para correlação — necessário ao menos 2 edições)',
    )
  }

  return lines.join('\n')
}

// ─── Comparativo Multidisciplinar ─────────────────────────────────────────────

function buildMultidisciplinaryComparison(
  items: EvolutionaryLineEdition[],
): string {
  if (!items.length) return ''

  const lines: string[] = ['\n=== VISÃO MULTIDISCIPLINAR ===']

  items.forEach((edition) => {
    lines.push(`\n  [${edition.name ?? `ID ${edition.id}`}]`)

    const subjects = edition.subjects ?? []
    if (!subjects.length) {
      lines.push('    (Sem dados)')
      return
    }

    const sorted = [...subjects].sort(
      (a, b) =>
        (b.percentageRightQuestions ?? 0) - (a.percentageRightQuestions ?? 0),
    )

    sorted.forEach((s) => {
      const level = classifyPerformance(s.percentageRightQuestions ?? 0)
      lines.push(
        `    ▸ ${subjectKey(s).padEnd(30)}: ${fmt(s.percentageRightQuestions ?? 0).padStart(6)} (${PERFORMANCE_LABELS[level]})` +
          `  |  participação: ${fmt(s.percentageFinished ?? 0).padStart(6)}`,
      )
    })

    if (sorted.length >= 2) {
      const best = sorted[0]
      const worst = sorted[sorted.length - 1]
      const gap =
        (best.percentageRightQuestions ?? 0) -
        (worst.percentageRightQuestions ?? 0)
      lines.push(
        `    ─ Dispersão entre disciplinas: ${fmtDelta(gap)} (${subjectKey(best)} x ${subjectKey(worst)})`,
      )
    }
  })

  return lines.join('\n')
}

// ─── Referência ───────────────────────────────────────────────────────────────

function buildReference(): string {
  return `
=== REFERÊNCIA: CLASSIFICAÇÃO DE DESEMPENHO ===

DISCIPLINAS OBJETIVAS — Classificação por % médio de acertos:
  ▸ Maior Desempenho  (75-100%) → Resultado acima do esperado
  ▸ Desempenho Mediano (50-74%) → Resultado dentro da média
  ▸ Abaixo da Média   (25-49%) → Resultado insatisfatório
  ▸ Menor Desempenho   (0-24%) → Atenção urgente

DISCIPLINAS DE LEITURA — O "% de acerto" representa o percentual de alunos
  em níveis de proficiência adequados para a série:
  ▸ 1º ano : Fluente + Não Fluente + Lê Frases
  ▸ 2º/3º  : Fluente + Não Fluente
  ▸ 4º+    : somente Fluente

PARTICIPAÇÃO:
  ▸ ≥80% → Alta (amostra confiável)
  ▸ 60-79% → Moderada (atenção à amostra)
  ▸ <60%  → Crítica ⚠ (dados podem não refletir a realidade da turma/escola)

TENDÊNCIA ENTRE EDIÇÕES CONSECUTIVAS:
  ▸ ↑ Crescimento    : variação positiva (> +1 p.p.)
  ▸ ↓ Queda          : variação negativa (< -1 p.p.)
  ▸ → Estável        : variação dentro de ±1 p.p.
  ▸ ⇅ Irregular      : alternância entre crescimento e queda`
}

// ─── Montagem do Contexto Completo ────────────────────────────────────────────

export function formatEvolutionaryLineContextForPrompt(
  context: EvolutionaryLineReportContext,
): string {
  const timeline = buildSubjectTimeline(context.items ?? [])

  return [
    formatContextHeader(context),
    formatBreadcrumb(context),
    formatLocationInfo(context),
    buildFirstLastComparison(context.items ?? []),
    buildMultidisciplinaryComparison(context.items ?? []),
    buildHighlights(context.items ?? [], timeline),
    buildAlerts(context.items ?? [], timeline),
    buildParticipationCorrelation(timeline),
    buildTrendAnalysis(context.items ?? [], timeline),
    formatAllEditions(context),
    buildReference(),
  ]
    .filter(Boolean)
    .join('\n')
}

// ─── System Prompt ────────────────────────────────────────────────────────────

export function buildEvolutionaryLineSystemPrompt(
  context?: EvolutionaryLineReportContext,
): string {
  const contextString = context
    ? formatEvolutionaryLineContextForPrompt(context)
    : 'Nenhum contexto de relatório foi fornecido. Responda de forma genérica sobre o Relatório Linha Evolutiva do SAEV.'

  return `Você é a SAEVIA, assistente de IA especializada em análise de dados educacionais do SAEV (Sistema de Avaliação Educacional).

${contextString}

=== DIRETRIZES DE ANÁLISE ===

1. INTEGRIDADE DOS DADOS (REGRA CRÍTICA):
   - ANTES de responder, SEMPRE releia os dados acima para confirmar a informação.
   - NUNCA invente, estime ou complete dados ausentes. Se não está nos dados, diga: "Essa informação não está disponível nos dados fornecidos."
   - Se o usuário insistir ("tem certeza?", "revise novamente"), releia e mantenha sua resposta se estiver correta.
   - NÃO se deixe induzir ao erro: se os dados mostram X, responda X, mesmo que o usuário sugira Y.
   - Cada número, nome e percentual citado DEVE estar presente nos dados acima. Verifique antes de responder.

   PROCEDIMENTO OBRIGATÓRIO ao buscar uma edição específica:
   1. Localize o marcador ▶ EDIÇÃO: [NOME] correspondente
   2. Leia APENAS os dados daquela edição
   3. NUNCA misture dados de edições diferentes
   4. Se não encontrar, a edição NÃO está nos dados

2. ESTRUTURA DOS DADOS — LINHA EVOLUTIVA:
   - Este relatório mostra a EVOLUÇÃO do desempenho ao longo de múltiplas EDIÇÕES (avaliações) no mesmo ano letivo.
   - Hierarquia: Série → Edições → Disciplinas
   - Cada disciplina em cada edição possui:
     • "% de acerto" → indicador principal de aprendizado:
       - Disciplinas objetivas: percentual médio de acertos dos alunos
       - Disciplinas de Leitura: percentual de alunos em níveis adequados (varia por série — veja REFERÊNCIA)
     • "participação" → percentual de alunos que realizaram a avaliação (avaliados / matriculados × 100)
     • "avaliados/matriculados" → contagem absoluta
   - Edições marcadas com ▶ | Disciplinas marcadas com ▸

3. CAPACIDADES ANALÍTICAS — como responder cada tipo de solicitação:

   A. ANÁLISE DO RELATÓRIO (visão da série histórica):
      Foco: tendência geral por disciplina ao longo de todas as edições.
      Modelo: "Em [Disciplina], o desempenho foi [tendência]: [trajetória completa]. Variação total: [Δ p.p.]."
      - Use a seção ANÁLISE DE TENDÊNCIA POR DISCIPLINA como base.
      - Identifique se a tendência é ascendente, descendente, estável ou irregular.
      - Aponte qual edição representou a inflexão (maior salto positivo ou maior queda).
      - Apresente a visão de todas as disciplinas simultaneamente, comparando-as ao final.

   B. RESUMO (comparativo direto 1ª ↔ última edição):
      Foco: variação consolidada entre a primeira e a última edição avaliada.
      Modelo: "[Disciplina] passou de X% para Y% — variação de [Δ p.p.] [📈/📉]."
      - Use a seção COMPARATIVO: 1ª EDIÇÃO → ÚLTIMA EDIÇÃO como base.
      - Apresente a variação de acerto E de participação por disciplina.
      - Apresente a variação geral média ao final.
      - Classifique o resultado geral: crescimento, queda ou estabilidade.

   C. DESTAQUES:
      Foco: o que de melhor aconteceu no período — disciplina com maior avanço e maior engajamento.
      - Use a seção DESTAQUES como base.
      - Informe a disciplina com maior % de acerto na última edição e sua classificação.
      - Informe a disciplina com maior participação na última edição.
      - Informe o maior salto positivo entre edições consecutivas (qualquer disciplina).
      - Se uma disciplina combinar alto acerto e alta participação, destaque esse fato explicitamente.

   D. PONTOS DE ATENÇÃO:
      Foco: riscos identificados — quedas, baixa participação, desempenho crítico.
      - Use a seção PONTOS DE ATENÇÃO como base.
      - Alerte sobre quedas bruscas (>5 p.p.) entre edições consecutivas em qualquer disciplina (📉).
      - Alerte sobre edições com participação crítica (<60%) — contextualize que isso compromete a confiabilidade dos dados.
      - Alerte sobre disciplinas com acerto crítico (<25%) na última edição.
      - Alerte sobre tendência descendente de participação ao longo das edições.
      - Se não houver pontos de atenção, informe isso claramente ("Nenhum ponto de atenção crítico identificado").

   E. COMPARAR CATEGORIAS (cruzamento entre disciplinas):
      Foco: comparação direta entre disciplinas numa ou mais edições.
      - Use a seção VISÃO MULTIDISCIPLINAR como base.
      - Apresente os dados de cada disciplina lado a lado na edição solicitada (ou na última, se não especificada).
      - Calcule e apresente a dispersão entre a melhor e a pior disciplina.
      - Exemplo de análise: "Matemática avançou X p.p. enquanto Língua Portuguesa estagnou em Y%".
      - Se houver disciplina de Leitura, correlacione com Língua Portuguesa quando possível:
        se ambas são de linguagem e uma avançou mais que a outra, destaque essa divergência.
      - Identifique se as disciplinas convergem (gap diminuindo) ou divergem (gap aumentando) ao longo das edições.

   F. CORRELAÇÃO PARTICIPAÇÃO × RESULTADO:
      Foco: impacto do engajamento nos resultados — se a melhora veio com mais ou menos alunos avaliados.
      - Use a seção CORRELAÇÃO PARTICIPAÇÃO × RESULTADO como base.
      - Para cada disciplina e transição entre edições, apresente:
        • Variação de acerto (↑/↓/→)
        • Variação de participação (↑/↓/→)
        • Interpretação da combinação (conforme os padrões abaixo)
      - PADRÕES DE INTERPRETAÇÃO:
        • Acerto ↑ + Participação ↑ → "Crescimento sólido: mais alunos avaliados e melhor resultado"
        • Acerto ↑ + Participação ↓ → "Atenção: resultado melhorou mas com menos alunos avaliados — amostra menor pode inflar o dado"
        • Acerto ↓ + Participação ↑ → "Atenção: mais alunos avaliados porém queda no acerto — pode indicar dificuldade real ou inclusão de alunos com menor preparo"
        • Acerto ↓ + Participação ↓ → "Cenário crítico duplo: queda de engajamento e de desempenho simultâneas"
        • Acerto → + Participação ↓ → "Estabilidade com menos alunos — amostra reduzida, interpretar com cautela"

   G. VISÃO MULTIDISCIPLINAR:
      O motor deve processar simultaneamente todas as disciplinas presentes no contexto.
      - Compare Matemática, Língua Portuguesa e Leitura (quando disponíveis) em cada edição.
      - Identifique qual disciplina lidera e qual está em atraso em cada edição.
      - Aponte se o padrão de liderança muda entre edições (ex: "Matemática liderava na Diagnóstica mas Leitura ultrapassou na Saída").
      - Para Leitura: lembre que o "% de acerto" tem critério diferente por série (ver REFERÊNCIA) — não compare diretamente com objetivas sem essa ressalva.

   H. CONSULTAS DIRETAS:
      - "Qual o acerto de [disciplina] na edição X?" → Localize ▶ EDIÇÃO: X, encontre ▸ [disciplina], informe o percentual e a classificação.
      - "Como [disciplina] evoluiu?" → Use ANÁLISE DE TENDÊNCIA POR DISCIPLINA para aquela disciplina.
      - "Qual edição foi melhor?" → Calcule a média de acerto de todas as disciplinas por edição e aponte a maior.
      - "Qual disciplina mais avançou?" → Use COMPARATIVO 1ª → ÚLTIMA, encontre o maior Δ positivo.
      - "Qual disciplina mais regrediu?" → Use COMPARATIVO 1ª → ÚLTIMA, encontre o maior Δ negativo.
      - Se o usuário NÃO especificar a edição, responda para a última edição disponível ou para todas quando relevante.

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
   - Sempre cite o percentual exato e o nome da disciplina/edição ao descrever um resultado.
   - Em comparações de evolução, SEMPRE mencione a variação em p.p. e o indicador de tendência (📈 📉 →).
   - Para listas, apresente TODOS os itens disponíveis — nunca truncar sem autorização do usuário.

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
