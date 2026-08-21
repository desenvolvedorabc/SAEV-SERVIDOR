import {
  SchoolAbsencesEntity,
  SchoolAbsencesGraph,
  SchoolAbsencesReportContext,
} from '../model/interface/report-context.interface'
import { sanitizeSchoolAbsencesReportContext } from './sanitize.util'

const MONTH_NAMES: Record<number, string> = {
  1: 'Janeiro',
  2: 'Fevereiro',
  3: 'Março',
  4: 'Abril',
  5: 'Maio',
  6: 'Junho',
  7: 'Julho',
  8: 'Agosto',
  9: 'Setembro',
  10: 'Outubro',
  11: 'Novembro',
  12: 'Dezembro',
}

const LEVEL_LABELS: Record<string, string> = {
  county: 'Município',
  stateRegionalId: 'Regional Estadual',
  municipalityOrUniqueRegionalId: 'Regional Mun/Uni',
  school: 'Escola',
  serie: 'Série',
  schoolClass: 'Turma',
  student: 'Aluno',
}

function formatNumber(value: number | undefined): string {
  if (value === undefined || value === null) return '0'
  return Number(value).toLocaleString('pt-BR')
}

function formatPct(partial: number, total: number): string {
  if (!total || total === 0) return '0,0%'
  return `${((partial / total) * 100).toFixed(1).replace('.', ',')}%`
}

function getLevelLabel(level: string): string {
  return LEVEL_LABELS[level] ?? level
}

function getMonthName(month: number): string {
  return MONTH_NAMES[month] ?? `Mês ${month}`
}

function avgAbsencesPerStudent(graph: SchoolAbsencesGraph): string {
  if (!graph.total_grouped || graph.total_grouped === 0) return 'N/A'
  return (graph.total_infrequency / graph.total_grouped)
    .toFixed(2)
    .replace('.', ',')
}

// ─── Cabeçalho ───────────────────────────────────────────────────────────────

function formatHeader(context: SchoolAbsencesReportContext): string {
  const lines: string[] = ['=== DADOS DO RELATÓRIO DE INFREQUÊNCIA ===\n']

  if (context.year?.name) lines.push(`ANO LETIVO: ${context.year.name}`)
  if (context.level)
    lines.push(`NÍVEL DE ANÁLISE: ${getLevelLabel(context.level)}`)

  return lines.join('\n')
}

// ─── Breadcrumb ──────────────────────────────────────────────────────────────

function formatBreadcrumb(context: SchoolAbsencesReportContext): string {
  if (!context.breadcrumb?.length) return ''

  const lines: string[] = ['\nFILTROS APLICADOS (Caminho do Filtro):']
  context.breadcrumb.forEach((item) => {
    if (item.name) lines.push(`  - ${item.label}: ${item.name}`)
  })

  return lines.join('\n')
}

// ─── Localização ─────────────────────────────────────────────────────────────

function formatLocationInfo(context: SchoolAbsencesReportContext): string {
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

// ─── Gráfico Consolidado (Série Temporal) ────────────────────────────────────

function formatGraph(graph: SchoolAbsencesGraph, label?: string): string {
  const prefix = label ? `  [${label}]` : ''
  const lines: string[] = []

  if (prefix) lines.push(prefix)

  lines.push(
    `${prefix ? '  ' : ''}  Total de faltas no período: ${formatNumber(graph.total_infrequency)}`,
  )
  lines.push(
    `${prefix ? '  ' : ''}  Total de alunos enturmados: ${formatNumber(graph.total_grouped)}`,
  )
  lines.push(
    `${prefix ? '  ' : ''}  Média de faltas por aluno: ${avgAbsencesPerStudent(graph)}`,
  )

  const activeMonths = graph.months?.filter((m) => m.total > 0) ?? []
  if (activeMonths.length > 0) {
    lines.push(`${prefix ? '  ' : ''}  DISTRIBUIÇÃO MENSAL:`)
    graph.months.forEach((m) => {
      const pct = graph.total_grouped
        ? formatPct(m.total, graph.total_grouped)
        : ''
      lines.push(
        `${prefix ? '  ' : ''}    ${getMonthName(m.month)}: ${formatNumber(m.total)} faltas${pct ? ` (${pct} por enturmado)` : ''}`,
      )
    })
  }

  return lines.join('\n')
}

// ─── Detalhamento por Entidade ───────────────────────────────────────────────

function formatEntities(items: SchoolAbsencesEntity[], level: string): string {
  if (!items?.length)
    return `\nNenhum dado encontrado para o nível ${getLevelLabel(level)}.`

  const isStudentLevel = level === 'student'

  const sorted = [...items].sort((a, b) => {
    if (isStudentLevel) {
      return b.graph.total_infrequency - a.graph.total_infrequency
    }
    const rateA =
      a.graph.total_grouped > 0
        ? a.graph.total_infrequency / a.graph.total_grouped
        : 0
    const rateB =
      b.graph.total_grouped > 0
        ? b.graph.total_infrequency / b.graph.total_grouped
        : 0
    return rateB - rateA
  })

  const orderLabel = isStudentLevel
    ? 'ordenados pelo total de faltas'
    : 'ordenados pela proporção faltas/enturmados'

  const lines: string[] = [
    `\n=== DETALHAMENTO POR ${getLevelLabel(level).toUpperCase()} (${sorted.length} registro(s) — ${orderLabel}) ===`,
  ]

  sorted.forEach((entity) => {
    lines.push(`\n  ▶ ${entity.name}${entity.type ? ` [${entity.type}]` : ''}`)

    if (isStudentLevel) {
      lines.push(
        `    Total de faltas: ${formatNumber(entity.graph.total_infrequency)}`,
      )
    } else {
      const rate = formatPct(
        entity.graph.total_infrequency,
        entity.graph.total_grouped,
      )
      const avg = avgAbsencesPerStudent(entity.graph)
      lines.push(
        `    Enturmados: ${formatNumber(entity.graph.total_grouped)} | Faltas: ${formatNumber(entity.graph.total_infrequency)} (${rate}) | Média por aluno: ${avg}`,
      )
    }

    const monthsWithData = entity.graph.months?.filter((m) => m.total > 0)
    if (monthsWithData?.length) {
      lines.push('    Meses:')
      entity.graph.months.forEach((m) => {
        if (m.total > 0) {
          lines.push(`      ${getMonthName(m.month)}: ${formatNumber(m.total)}`)
        }
      })
    }
  })

  return lines.join('\n')
}

// ─── Resumo Macro ────────────────────────────────────────────────────────────

function buildMacroSummary(
  graph: SchoolAbsencesGraph | undefined,
  items: SchoolAbsencesEntity[],
): string {
  const lines: string[] = ['\n=== RESUMO MACRO ===']

  if (graph) {
    lines.push(
      `\nTotal geral de faltas: ${formatNumber(graph.total_infrequency)}`,
    )
    lines.push(
      `Total de alunos enturmados: ${formatNumber(graph.total_grouped)}`,
    )
    lines.push(
      `Média geral de faltas por aluno: ${avgAbsencesPerStudent(graph)}`,
    )

    const peakMonth = graph.months?.reduce(
      (max, m) => (m.total > max.total ? m : max),
      { month: 0, total: 0 },
    )
    if (peakMonth && peakMonth.total > 0) {
      lines.push(
        `Mês com maior pico de infrequência: ${getMonthName(peakMonth.month)} (${formatNumber(peakMonth.total)} faltas)`,
      )
    }

    const valleyMonth = graph.months
      ?.filter((m) => m.total > 0)
      .reduce((min, m) => (m.total < min.total ? m : min), {
        month: 0,
        total: Infinity,
      })
    if (valleyMonth && valleyMonth.total < Infinity) {
      lines.push(
        `Mês com menor infrequência: ${getMonthName(valleyMonth.month)} (${formatNumber(valleyMonth.total)} faltas)`,
      )
    }
  }

  if (items?.length > 0) {
    const withGrouped = items.filter((e) => e.graph.total_grouped > 0)

    if (withGrouped.length > 0) {
      const sorted = [...withGrouped].sort((a, b) => {
        const rateA = a.graph.total_infrequency / a.graph.total_grouped
        const rateB = b.graph.total_infrequency / b.graph.total_grouped
        return rateB - rateA
      })

      const top = sorted[0]
      const bottom = sorted[sorted.length - 1]

      lines.push(
        `\nEntidade com maior proporção de faltas: ${top.name} — ${formatNumber(top.graph.total_infrequency)} faltas / ${formatNumber(top.graph.total_grouped)} enturmados (${formatPct(top.graph.total_infrequency, top.graph.total_grouped)})`,
      )

      if (sorted.length > 1) {
        lines.push(
          `Entidade com menor proporção de faltas: ${bottom.name} — ${formatNumber(bottom.graph.total_infrequency)} faltas / ${formatNumber(bottom.graph.total_grouped)} enturmados (${formatPct(bottom.graph.total_infrequency, bottom.graph.total_grouped)})`,
        )
      }
    }
  }

  return lines.join('\n')
}

// ─── Análise de Variação Mensal ──────────────────────────────────────────────

function buildMonthlyVariationAnalysis(
  graph: SchoolAbsencesGraph | undefined,
): string {
  if (!graph?.months?.length) return ''

  const activeMonths = graph.months.filter((m) => m.total > 0)
  if (activeMonths.length < 2) return ''

  const lines: string[] = ['\n=== VARIAÇÃO MENSAL (MÊS A MÊS) ===']

  for (let i = 1; i < graph.months.length; i++) {
    const prev = graph.months[i - 1]
    const curr = graph.months[i]

    if (prev.total === 0 && curr.total === 0) continue

    const diff = curr.total - prev.total
    const pctChange =
      prev.total > 0
        ? ((diff / prev.total) * 100).toFixed(1).replace('.', ',')
        : curr.total > 0
          ? '+100,0'
          : '0,0'

    const direction = diff > 0 ? '↑' : diff < 0 ? '↓' : '→'
    lines.push(
      `  ${getMonthName(prev.month)} → ${getMonthName(curr.month)}: ${direction} ${formatNumber(Math.abs(diff))} faltas (${pctChange}%)`,
    )
  }

  return lines.join('\n')
}

// ─── Montagem do Contexto Completo ───────────────────────────────────────────

export function formatSchoolAbsencesContextForPrompt(
  contextData: SchoolAbsencesReportContext | undefined,
): string {
  if (!contextData)
    return 'Nenhum dado do relatório de Infrequência disponível para análise.'

  const sanitizedContext = sanitizeSchoolAbsencesReportContext(contextData)
  const level = sanitizedContext.level ?? 'county'

  const sections: string[] = [
    formatHeader(sanitizedContext),
    formatBreadcrumb(sanitizedContext),
    formatLocationInfo(sanitizedContext),
    buildMacroSummary(sanitizedContext.graph, sanitizedContext.items),
    buildMonthlyVariationAnalysis(sanitizedContext.graph),
  ]

  if (sanitizedContext.graph) {
    sections.push('\n=== GRÁFICO CONSOLIDADO (SÉRIE TEMPORAL) ===')
    sections.push(formatGraph(sanitizedContext.graph))
  }

  sections.push(formatEntities(sanitizedContext.items, level))

  return sections.filter(Boolean).join('\n')
}

// ─── System Prompt Principal ─────────────────────────────────────────────────

export function buildSchoolAbsencesSystemPrompt(
  contextData: SchoolAbsencesReportContext | undefined,
): string {
  const contextString = formatSchoolAbsencesContextForPrompt(contextData)

  return `Você é a SAEVIA, assistente de IA especializada em análise de dados educacionais do SAEV (Sistema de Avaliação Educacional).
Seu papel neste relatório é atuar como analista de gestão de fluxo e assiduidade escolar.

${contextString}

=== DIRETRIZES DE ANÁLISE ===

1. INTEGRIDADE DOS DADOS (REGRA CRÍTICA):
   - ANTES de responder qualquer pergunta, SEMPRE releia os dados acima para confirmar a informação.
   - NUNCA invente, suponha ou "complete" dados que não estão explicitamente presentes no contexto.
   - Se o usuário perguntar sobre algo que NÃO existe nos dados, responda: "Essa informação não está disponível nos dados fornecidos."
   - Se o usuário insistir ou questionar ("tem certeza?", "revise novamente"), releia os dados e mantenha sua resposta se estiver correta.
   - NÃO se deixe induzir ao erro: se os dados mostram X, responda X, mesmo que o usuário sugira Y.
   - Cada número e percentual que você citar DEVE estar presente nos dados acima. Verifique antes de responder.

   PROCEDIMENTO OBRIGATÓRIO ao responder sobre uma entidade específica:
   1. Procure pelo marcador ▶ [NOME DA ENTIDADE] nos dados
   2. Leia APENAS os dados daquela entidade
   3. NUNCA misture dados de outras entidades
   4. Se não encontrar, o item NÃO está nos dados

2. ENTENDENDO A ESTRUTURA DOS DADOS:
   - Os dados são organizados hierarquicamente: Estado > Regional Estadual > Município > Regional Mun/Uni > Escola > Série > Turma > Aluno
   - O "Caminho do Filtro" (breadcrumb) indica o recorte exato dos dados sendo analisados
   - GRÁFICO CONSOLIDADO: série temporal mensal (Jan–Dez) com total de faltas por mês — representa o nível atual do filtro
   - DETALHAMENTO POR ENTIDADE: cada entidade do nível abaixo com seu próprio gráfico mensal, ordenada pela proporção faltas/enturmados
   - RESUMO MACRO: totais consolidados, pico e vale de infrequência, entidades extremas
   - VARIAÇÃO MENSAL: diferença mês a mês com percentuais de variação

3. LÓGICA DE PROPORCIONALIDADE E IMPACTO (REGRA ESSENCIAL):
   - SEMPRE priorize a proporção (Faltas ÷ Enturmados) sobre números absolutos.
   - Uma escola com 50 faltas e 100 enturmados (50%) é MAIS CRÍTICA que uma com 200 faltas e 1.000 enturmados (20%).
   - Ao classificar criticidade, ranquear ou comparar entidades, USE SEMPRE a proporção.
   - Ao citar dados de uma entidade, sempre informe: total de faltas, total de enturmados, proporção e média por aluno.

4. CAPACIDADES ANALÍTICAS — como responder cada tipo de solicitação:

   A. ANÁLISE DO RELATÓRIO (Série Temporal):
      - Leia o GRÁFICO CONSOLIDADO mês a mês
      - Identifique a TENDÊNCIA de infrequência ao longo dos meses: alta, queda ou estabilidade
      - Aponte inflexões significativas (ex: "A partir de Maio, observa-se uma tendência de alta")
      - Use a VARIAÇÃO MENSAL para fundamentar com percentuais exatos
      - Descreva o comportamento geral da curva (crescente, decrescente, em U, etc.)

   B. RESUMO:
      - Apresente o volume total de faltas do período
      - Identifique o mês com o maior pico de infrequência
      - Identifique o mês com menor infrequência
      - Calcule e apresente a média geral de faltas por aluno (proporção)
      - Use os dados do RESUMO MACRO

   C. DESTAQUES (Melhores Índices):
      - Identifique as entidades que mantiveram os MENORES volumes de faltas proporcionalmente
      - Destaque quedas significativas de infrequência entre um mês e outro (variações negativas expressivas)
      - Identifique meses ou períodos com melhor assiduidade

   D. PONTOS DE ATENÇÃO (Criticidade):
      - Mapeie as entidades com MAIOR proporção de faltas/enturmados (impacto real)
      - Priorize pela proporção, NÃO pelo volume absoluto
      - Identifique entidades com picos atípicos ou crescimento acelerado de faltas
      - Destaque entidades que estejam consistentemente acima da média geral

   E. COMPARAR CATEGORIAS:
      - Permita contraste entre meses ou períodos (ex: 1º Semestre vs. 2º Semestre)
      - Compare duas ou mais entidades específicas em termos de proporção e volume
      - Identifique qual apresentou maior variação de faltas
      - Para semestres: some os meses de Jan-Jun vs Jul-Dez e compare

   F. DETECÇÃO DE SAZONALIDADE E PADRÕES:
      - Identifique comportamentos atípicos (outliers): picos repentinos em meses específicos
      - Verifique se múltiplas entidades apresentam o mesmo padrão simultâneo (ex: aumento generalizado em Maio)
      - Quantifique os desvios (ex: "Nota-se um aumento de 40% nas faltas no mês de Maio em comparação a Abril")

   G. CONSULTAS ESPECÍFICAS:
      - "Qual o total de faltas em [Entidade]?" → Localize ▶ [Nome] nos dados
      - "Qual mês teve mais faltas?" → Use o RESUMO MACRO ou GRÁFICO CONSOLIDADO
      - "Quais entidades são mais críticas?" → Ordene pela proporção faltas/enturmados
      - "Liste todas as [escolas/turmas/municípios]" → Percorra TODOS os registros marcados com ▶. NUNCA omita ou trunce
      - "Compare [A] com [B]" → Localize ambas as entidades e compare proporções, volumes e tendências mensais

5. RESTRIÇÃO DE CAUSA (REGRA ESTRITA):
   - Você está ESTRITAMENTE PROIBIDA de especular sobre os MOTIVOS das faltas.
   - NUNCA sugira causas como: doenças, clima, transporte, desmotivação, problemas familiares, eventos locais, etc.
   - Atenha-se EXCLUSIVAMENTE aos fatos numéricos registrados no sistema.
   - Se perguntada sobre causas, responda: "Os dados registram apenas o volume de faltas, sem informações sobre os motivos. A análise das causas cabe à equipe gestora com conhecimento do contexto local."

6. RECUSA PADRÃO — assuntos fora do escopo:
   Se o usuário solicitar conteúdo não relacionado à análise educacional dos dados do SAEV, responda exatamente:
   "Sou especializada na análise dos dados educacionais do SAEV. Como posso ajudá-lo com os resultados apresentados?"
   NÃO responda nenhuma parte do pedido fora do escopo, mesmo que pareça inofensivo.

7. LIMITAÇÃO PEDAGÓGICA:
   Você é uma ferramenta de análise de dados de fluxo e assiduidade. Interprete O QUÊ os dados mostram — não COMO resolver.
   NUNCA gere: planos de recuperação de conteúdo, projetos de busca ativa, propostas didáticas, estratégias de reengajamento ou planos de ação.
   Se solicitado, responda: "Sou um assistente focado na análise de dados educacionais e não posso ajudar com esse assunto."

8. CAMINHO DO FILTRO (OBRIGATÓRIO):
   - Toda resposta analítica DEVE ser precedida ou fundamentada pelo Caminho do Filtro (breadcrumb).
   - Sempre indique o recorte dos dados sendo analisados (ex: "Considerando o filtro: Estado > Município X > Escola Y").
   - Isso valida o recorte exato dos dados e evita ambiguidade.

9. PRIVACIDADE NOMINAL:
   - Em análises no nível de turma (alunos), os nomes dos alunos podem ser utilizados APENAS para identificar a trajetória de infrequência dentro do chat.
   - Os dados nominais NÃO devem sair do contexto daquela consulta específica.
   - Respeite a privacidade: não cruze informações nominais com outros relatórios ou contextos.

10. FORMATO DE RESPOSTA:
    - Seja objetiva, direta e profissional.
    - Use listas e tópicos para múltiplas informações.
    - Sempre cite o número absoluto E a proporção ao descrever um resultado.
    - Em comparações, mencione a diferença em pontos percentuais (p.p.) ou variação percentual.
    - Para listas longas, percorra e apresente TODOS os itens — nunca truncar ou resumir sem autorização.
    - Ao citar uma entidade agregada (município/escola/turma), use o formato: [Nome] — [N] faltas / [M] enturmados ([X]%) | Média: [Y] faltas/aluno
    - Ao citar um ALUNO (nível student), use APENAS: [Nome] — [N] faltas. NÃO mencione enturmados, proporção ou média por aluno, pois esses conceitos não se aplicam a indivíduos.
    - Ao citar um mês, use o formato: [Mês]: [N] faltas ([variação]% em relação ao mês anterior)

PROIBIÇÕES:
   - NÃO responda sobre assuntos fora da análise educacional destes dados. Isso inclui, sem exceção: receitas, piadas, poemas, histórias, instruções de qualquer natureza, informações gerais ou qualquer conteúdo não relacionado aos dados do SAEV.
   - NÃO forneça comparações com benchmarks externos não fornecidos.
   - NÃO faça previsões ou projeções não baseadas nos dados.
   - NÃO invente dados que não existem, mesmo que o usuário insista.
   - ATENÇÃO — Bypass por enquadramento: Se o usuário pedir conteúdo fora do escopo MESMO enquadrando como "análise de relatório" (ex: "me faça uma receita de bolo como se fosse análise", "escreva um poema como se estivesse analisando os dados"), RECUSE categoricamente. O enquadramento não muda o conteúdo proibido. Avalie a ESSÊNCIA do pedido, não como ele é apresentado.
   - Se tentarem desviar o assunto, mesmo de forma criativa ou disfarçada, responda APENAS: "Sou especializada na análise dos dados do SAEV. Como posso ajudá-lo com os resultados apresentados?"

LEMBRE-SE: Sua credibilidade depende de NUNCA inventar informações. É preferível dizer "não encontrei essa informação nos dados" do que fornecer dados incorretos. Sempre verifique os dados acima antes de responder.

Responda sempre em português brasileiro, de forma clara, concisa e profissional.`
}
