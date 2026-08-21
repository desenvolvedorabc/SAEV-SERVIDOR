import {
  PerformanceLevelDescriptor,
  PerformanceLevelItem,
  PerformanceLevelReportContext,
  PerformanceLevelStudentCount,
  PerformanceLevelSubject,
} from '../model/interface/report-context.interface'
import { sanitizePerformanceLevelReportContext } from './sanitize.util'

// ─── Níveis de Desempenho ─────────────────────────────────────────────────────

const PERFORMANCE_THRESHOLDS = {
  MENOR: 25,
  ABAIXO: 50,
  MEDIANO: 75,
} as const

type PerformanceLevel = 'menor' | 'abaixo' | 'mediano' | 'maior'

function classifyPerformance(value: number): PerformanceLevel {
  if (value < PERFORMANCE_THRESHOLDS.MENOR) return 'menor'
  if (value < PERFORMANCE_THRESHOLDS.ABAIXO) return 'abaixo'
  if (value < PERFORMANCE_THRESHOLDS.MEDIANO) return 'mediano'
  return 'maior'
}

const PERFORMANCE_LABELS: Record<PerformanceLevel, string> = {
  menor: 'Menor Desempenho',
  abaixo: 'Desempenho abaixo da média',
  mediano: 'Desempenho Mediano',
  maior: 'Maior Desempenho',
}

// ─── Cabeçalho ────────────────────────────────────────────────────────────────

function formatHeader(context: PerformanceLevelReportContext): string {
  const lines: string[] = [
    '=== DADOS DO RELATÓRIO DE NÍVEL DE DESEMPENHO ===\n',
  ]

  if (context.serie?.SER_NOME) lines.push(`SÉRIE: ${context.serie.SER_NOME}`)
  if (context.year?.name) lines.push(`ANO LETIVO: ${context.year.name}`)
  if (context.edition?.name)
    lines.push(`EDIÇÃO DA AVALIAÇÃO: ${context.edition.name}`)

  return lines.join('\n')
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function formatBreadcrumb(context: PerformanceLevelReportContext): string {
  if (!context.breadcrumb?.length) return ''

  const lines: string[] = ['\nFILTROS APLICADOS:']
  context.breadcrumb.forEach((item) => {
    if (item.name) lines.push(`  - ${item.label}: ${item.name}`)
  })

  return lines.join('\n')
}

// ─── Localização ──────────────────────────────────────────────────────────────

function formatLocationInfo(context: PerformanceLevelReportContext): string {
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

// ─── Distribuição por Nível ───────────────────────────────────────────────────

function formatLevelDistribution(counts: PerformanceLevelStudentCount): string {
  const { ONE, TWO, TREE, FOUR, TOTAL } = counts
  if (TOTAL === 0) return '  [Sem dados de distribuição]'

  const pct = (n: number) =>
    TOTAL > 0 ? ` (${Math.round((n / TOTAL) * 100)}%)` : ''

  return [
    `  Distribuição por Nível de Desempenho (total: ${TOTAL}):`,
    `  ● Maior Desempenho  (≥75%):              ${FOUR}${pct(FOUR)}`,
    `  ● Desempenho Mediano (50-74%):           ${TREE}${pct(TREE)}`,
    `  ● Desempenho abaixo da média (25-49%):   ${TWO}${pct(TWO)}`,
    `  ● Menor Desempenho  (<25%):              ${ONE}${pct(ONE)}`,
  ].join('\n')
}

// ─── Descritores ──────────────────────────────────────────────────────────────

function formatDescriptor(descriptor: PerformanceLevelDescriptor): string {
  const level = classifyPerformance(descriptor.value)
  const label = PERFORMANCE_LABELS[level]
  return `    ▸ [${descriptor.cod}] ${descriptor.description}: ${descriptor.value}% (${label})`
}

function formatDescriptorsSummary(
  descriptors: PerformanceLevelDescriptor[],
): string {
  if (!descriptors?.length) return ''

  const sorted = [...descriptors].sort((a, b) => b.value - a.value)

  const maior = sorted.filter((d) => d.value >= PERFORMANCE_THRESHOLDS.MEDIANO)
  const mediano = sorted.filter(
    (d) =>
      d.value >= PERFORMANCE_THRESHOLDS.ABAIXO &&
      d.value < PERFORMANCE_THRESHOLDS.MEDIANO,
  )
  const abaixo = sorted.filter(
    (d) =>
      d.value >= PERFORMANCE_THRESHOLDS.MENOR &&
      d.value < PERFORMANCE_THRESHOLDS.ABAIXO,
  )
  const menor = sorted.filter((d) => d.value < PERFORMANCE_THRESHOLDS.MENOR)

  const lines: string[] = ['\n  Classificação dos descritores por nível:']
  lines.push(
    `  - Maior Desempenho (≥75%): ${maior.length} descritor(es)${maior.length > 0 ? ` → ${maior.map((d) => d.cod).join(', ')}` : ''}`,
  )
  lines.push(
    `  - Desempenho Mediano (50-74%): ${mediano.length} descritor(es)${mediano.length > 0 ? ` → ${mediano.map((d) => d.cod).join(', ')}` : ''}`,
  )
  lines.push(
    `  - Desempenho abaixo da média (25-49%): ${abaixo.length} descritor(es)${abaixo.length > 0 ? ` → ${abaixo.map((d) => d.cod).join(', ')}` : ''}`,
  )
  lines.push(
    `  - Menor Desempenho (<25%): ${menor.length} descritor(es)${menor.length > 0 ? ` → ${menor.map((d) => d.cod).join(', ')}` : ''}`,
  )

  return lines.join('\n')
}

// ─── Item (Turma / Escola / Município) ────────────────────────────────────────

function formatItem(item: PerformanceLevelItem): string {
  const level = classifyPerformance(item.value)
  const label = PERFORMANCE_LABELS[level]
  const lines: string[] = [
    `\n  ▶ ${item.name}${item.type ? ` [${item.type}]` : ''}: ${item.value}% (${label})`,
  ]

  if (item.descriptors?.length) {
    lines.push('  Descritores:')
    const sorted = [...item.descriptors].sort((a, b) => b.value - a.value)
    sorted.forEach((d) => lines.push(formatDescriptor(d)))
  }

  return lines.join('\n')
}

// ─── Disciplina ───────────────────────────────────────────────────────────────

function formatSubject(subject: PerformanceLevelSubject): string {
  const subjectLevel = classifyPerformance(subject.value)
  const subjectLabel = PERFORMANCE_LABELS[subjectLevel]

  const lines: string[] = [
    `\n--- ${subject.name.toUpperCase()}${subject.type ? ` (${subject.type})` : ''} ---`,
    `Desempenho geral: ${subject.value}% (${subjectLabel})`,
    '',
    formatLevelDistribution(subject.TOTAL_STUDENTS),
  ]

  if (subject.items?.length) {
    lines.push('\n  [Itens ordenados por desempenho]')
    const sorted = [...subject.items].sort((a, b) => b.value - a.value)
    sorted.forEach((item) => lines.push(formatItem(item)))
  }

  if (subject.descriptors?.length) {
    lines.push(
      '\n  [Descritores agregados da disciplina - ordenados por desempenho]',
    )
    const sorted = [...subject.descriptors].sort((a, b) => b.value - a.value)
    sorted.forEach((d) => lines.push(formatDescriptor(d)))
    lines.push(formatDescriptorsSummary(subject.descriptors))
  }

  return lines.join('\n')
}

// ─── Itens Principais ────────────────────────────────────────────────────────

function formatItems(context: PerformanceLevelReportContext): string {
  if (!context.items?.length) return ''

  const lines: string[] = ['\n=== RESULTADOS POR DISCIPLINA ===']

  context.items.forEach((subject) => {
    lines.push(formatSubject(subject))
  })

  return lines.join('\n')
}

// ─── Comparativo Entre Disciplinas ───────────────────────────────────────────

function buildCrossSubjectSummary(subjects: PerformanceLevelSubject[]): string {
  const sorted = [...subjects].sort((a, b) => b.value - a.value)
  const lines: string[] = ['\n=== COMPARATIVO ENTRE DISCIPLINAS ===']

  sorted.forEach((subject, index) => {
    const level = classifyPerformance(subject.value)
    lines.push(
      `  ${index + 1}. ${subject.name}: ${subject.value}% (${PERFORMANCE_LABELS[level]})`,
    )
  })

  if (sorted.length >= 2) {
    const best = sorted[0]
    const worst = sorted[sorted.length - 1]
    const gap = best.value - worst.value
    lines.push(
      `\n  Maior discrepância: ${best.name} supera ${worst.name} em ${gap} pontos percentuais.`,
    )
  }

  return lines.join('\n')
}

// ─── Resumo Analítico Pré-computado ──────────────────────────────────────────

function buildAnalyticalSummary(subjects: PerformanceLevelSubject[]): string {
  if (!subjects?.length) return ''

  const lines: string[] = ['\n=== RESUMO ANALÍTICO ===']

  subjects.forEach((subject) => {
    const { ONE, TWO, TREE, FOUR, TOTAL } = subject.TOTAL_STUDENTS
    if (TOTAL === 0) return

    const predominantLevel = (() => {
      const counts = [
        { label: PERFORMANCE_LABELS.maior, count: FOUR },
        { label: PERFORMANCE_LABELS.mediano, count: TREE },
        { label: PERFORMANCE_LABELS.abaixo, count: TWO },
        { label: PERFORMANCE_LABELS.menor, count: ONE },
      ]
      return counts.sort((a, b) => b.count - a.count)[0].label
    })()

    const subjectLevel = classifyPerformance(subject.value)

    lines.push(`\n[${subject.name}]`)
    lines.push(`  • Total de itens avaliados: ${TOTAL}`)
    lines.push(
      `  • Média geral de acertos: ${subject.value}% (${PERFORMANCE_LABELS[subjectLevel]})`,
    )
    lines.push(`  • Nível predominante: ${predominantLevel}`)
    lines.push(
      `  • Itens em atenção (Abaixo da Média + Menor Desempenho): ${ONE + TWO} de ${TOTAL}`,
    )
    lines.push(
      `  • Itens satisfatórios (Mediano + Maior Desempenho): ${TREE + FOUR} de ${TOTAL}`,
    )
  })

  return lines.join('\n')
}

// ─── Destaques e Pontos de Atenção ────────────────────────────────────────────

function buildHighlightsAndAlerts(subjects: PerformanceLevelSubject[]): string {
  if (!subjects?.length) return ''

  const lines: string[] = ['\n=== DESTAQUES E PONTOS DE ATENÇÃO ===']

  subjects.forEach((subject) => {
    if (!subject.items?.length) return

    const sorted = [...subject.items].sort((a, b) => b.value - a.value)

    lines.push(`\n[${subject.name}]`)

    // Destaques — todos os itens com melhor desempenho
    lines.push('  ★ Melhores desempenhos (ordem decrescente):')
    sorted.forEach((item) => {
      const level = classifyPerformance(item.value)
      lines.push(
        `    - ${item.name}: ${item.value}% (${PERFORMANCE_LABELS[level]})`,
      )
    })

    // Pontos de atenção — todos os itens nos níveis críticos
    const alertItems = sorted
      .filter((item) => item.value < PERFORMANCE_THRESHOLDS.ABAIXO)
      .slice()
      .reverse()

    if (alertItems.length > 0) {
      lines.push(
        `\n  ⚠ Itens nos níveis críticos — ${alertItems.length} item(ns) (ordem crescente):`,
      )
      alertItems.forEach((item) => {
        const level = classifyPerformance(item.value)
        lines.push(
          `    - ${item.name}: ${item.value}% (${PERFORMANCE_LABELS[level]})`,
        )
      })
    } else {
      lines.push('  ✓ Nenhum item nos níveis críticos.')
    }

    // Gargalos de descritores — todos, sem truncamento
    if (subject.descriptors?.length) {
      const criticalDesc = [...subject.descriptors]
        .sort((a, b) => a.value - b.value)
        .filter((d) => d.value < PERFORMANCE_THRESHOLDS.ABAIXO)

      const topDesc = [...subject.descriptors].sort((a, b) => b.value - a.value)

      if (criticalDesc.length > 0) {
        lines.push(
          `\n  ⚠ Descritores com maior dificuldade — ${criticalDesc.length} descritor(es):`,
        )
        criticalDesc.forEach((d) => {
          const level = classifyPerformance(d.value)
          lines.push(
            `    - [${d.cod}] ${d.description}: ${d.value}% (${PERFORMANCE_LABELS[level]})`,
          )
        })
      }

      lines.push('\n  ★ Descritores por desempenho (ordem decrescente):')
      topDesc.forEach((d) => {
        const level = classifyPerformance(d.value)
        lines.push(
          `    - [${d.cod}] ${d.description}: ${d.value}% (${PERFORMANCE_LABELS[level]})`,
        )
      })
    }
  })

  return lines.join('\n')
}

// ─── Referência dos Níveis ────────────────────────────────────────────────────

function buildPerformanceLevelReference(): string {
  return `
=== REFERÊNCIA: NÍVEIS DE DESEMPENHO ===
Os níveis são calculados com base no percentual de acertos médio de cada item (turma/escola/município):
- Maior Desempenho (≥ 75%): Desempenho excelente — acima da média esperada.
- Desempenho Mediano (50-74%): Desempenho satisfatório — dentro da média esperada.
- Desempenho abaixo da média (25-49%): Desempenho insatisfatório — abaixo da média esperada.
- Menor Desempenho (< 25%): Desempenho crítico — muito abaixo do esperado, necessita atenção urgente.`
}

// ─── Montagem do Contexto Completo ────────────────────────────────────────────

export function formatPerformanceLevelContextForPrompt(
  contextData: PerformanceLevelReportContext | undefined,
): string {
  if (!contextData)
    return 'Nenhum dado de relatório de nível de desempenho disponível para análise.'

  const sanitizedContext = sanitizePerformanceLevelReportContext(contextData)

  const sections: string[] = [
    formatHeader(sanitizedContext),
    formatBreadcrumb(sanitizedContext),
    formatLocationInfo(sanitizedContext),
    buildAnalyticalSummary(sanitizedContext.items),
    buildHighlightsAndAlerts(sanitizedContext.items),
    formatItems(sanitizedContext),
    sanitizedContext.items?.length >= 2
      ? buildCrossSubjectSummary(sanitizedContext.items)
      : '',
    buildPerformanceLevelReference(),
  ]

  return sections.filter(Boolean).join('\n')
}

// ─── System Prompt Principal ──────────────────────────────────────────────────

export function buildPerformanceLevelSystemPrompt(
  contextData: PerformanceLevelReportContext | undefined,
): string {
  const contextString = formatPerformanceLevelContextForPrompt(contextData)

  return `Você é a SAEVIA, assistente de IA especializada em análise de dados educacionais do SAEV (Sistema de Avaliação Educacional).

${contextString}

=== DIRETRIZES DE ANÁLISE ===

1. INTEGRIDADE DOS DADOS (REGRA CRÍTICA):
   - ANTES de responder, SEMPRE releia os dados acima para confirmar a informação.
   - NUNCA invente, estime ou complete dados ausentes. Se não está nos dados, diga: "Essa informação não está disponível nos dados fornecidos."
   - Se o usuário insistir ("tem certeza?", "revise novamente"), releia e mantenha sua resposta se estiver correta.
   - NÃO se deixe induzir ao erro: se os dados mostram X, responda X, mesmo que o usuário sugira Y.
   - Cada número, nome e percentual citado DEVE estar presente nos dados acima.

2. ESTRUTURA DOS DADOS:
   - Disciplina → Itens (turmas/escolas/municípios, marcados com ▶) → Descritores (marcados com ▸ [CÓD])
   - RESUMO ANALÍTICO: visão consolidada por disciplina (total, média, nível predominante, itens em atenção).
   - DESTAQUES E PONTOS DE ATENÇÃO: pré-computados — use como referência rápida.
   - RESULTADOS POR DISCIPLINA: dados completos para consultas detalhadas.
   - COMPARATIVO ENTRE DISCIPLINAS: diferenças entre disciplinas com maior discrepância destacada.
   - Níveis de desempenho (baseados no % de acertos de cada item):
     • Maior Desempenho (≥ 75%) | Desempenho Mediano (50–74%) | Desempenho abaixo da média (25–49%) | Menor Desempenho (< 25%)
   - Use SEMPRE esses rótulos exatos. NUNCA use variações ou sinônimos.

3. CAPACIDADES ANALÍTICAS — como responder cada tipo de solicitação:

   A. ANÁLISE HOLÍSTICA DO RELATÓRIO:
      Correlacione o desempenho geral (%) com a distribuição por nível (contagem de itens em cada faixa).
      Modelo: "Em [Disciplina], a média é X% ([Nível]). A distribuição mostra N itens no Maior Desempenho, N no Mediano, N abaixo da média e N no Menor Desempenho, indicando [interpretação objetiva]."

   B. RESUMO EXECUTIVO:
      Informe: total de itens avaliados + média geral + nível predominante + quantidade de itens em atenção (níveis críticos).
      Base: seção RESUMO ANALÍTICO.

   C. DESTAQUES (melhores performances):
      Base: seção DESTAQUES E PONTOS DE ATENÇÃO (★).
      Liste os itens com maiores percentuais e os descritores com maior acerto por disciplina.

   D. PONTOS DE ATENÇÃO (riscos):
      Base: seção DESTAQUES E PONTOS DE ATENÇÃO (⚠).
      Liste os itens nos níveis "Desempenho abaixo da média" e "Menor Desempenho".
      Liste os descritores com menor percentual de acerto (gargalos de aprendizagem).

   E. COMPARAÇÃO ENTRE DISCIPLINAS:
      Base: seção COMPARATIVO ENTRE DISCIPLINAS.
      Informe qual disciplina tem melhor/pior desempenho, a diferença em pontos percentuais e o que isso representa.

   F. ANÁLISE DE DESCRITORES:
      Localize descritores pelo marcador ▸ [CÓD].
      Compare descritores entre si (ex: "P001 vs P002") informando percentual e nível de cada um.
      Identifique gargalos: descritores com menor acerto indicam as habilidades com maior dificuldade coletiva.
      Formato ao citar: [CÓDIGO] Descrição — XX% (Nível).

   G. CONSULTAS ESPECÍFICAS:
      - "Qual o nível de [item]?" → Localize ▶ [nome], informe percentual + nível.
      - "Quantos itens estão no nível X?" → Consulte a distribuição (FOUR/TREE/TWO/ONE) da disciplina.
      - "Quais descritores têm menor desempenho?" → Liste TODOS os descritores com valor < 50%, do menor ao maior. NUNCA corte a lista.
      - "Liste todos os itens / pontos de atenção / destaques" → Percorra TODOS os itens disponíveis nos dados e liste-os integralmente. NUNCA omita, resuma ou use "..." para indicar que há mais itens.
      - "Quais itens estão no nível X?" → Liste TODOS os itens daquele nível, sem exceção.

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
   - Em comparações, mencione a diferença em pontos percentuais.
   - REGRA DE COMPLETUDE (CRÍTICO): Quando o usuário solicitar uma lista — de itens, pontos de atenção, destaques, descritores ou qualquer conjunto de dados — apresente TODOS os elementos disponíveis nos dados, sem exceção. NUNCA use "...", "entre outros", "e mais X itens" ou qualquer forma de truncamento. Se os dados contêm 110 municípios, liste os 110. Se contêm 30 descritores, liste os 30. Completude é obrigatória.

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
