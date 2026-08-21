import {
  NotEvaluatedDataGraph,
  NotEvaluatedReportContext,
  NotEvaluatedStudent,
  NotEvaluatedSubItem,
  NotEvaluatedSubject,
} from '../model/interface/report-context.interface'
import { sanitizeNotEvaluatedReportContext } from './sanitize.util'

// ─── Constantes ───────────────────────────────────────────────────────────────

const JUSTIFICATION_LABELS: Record<string, string> = {
  recusa: 'Recusou-se a participar',
  ausencia: 'Faltou mas está frequentando a escola',
  abandono: 'Abandonou a escola',
  transferencia: 'Foi transferido para outra escola',
  deficiencia: 'Não participou por motivo de deficiência',
  nao_participou: 'Não participou',
}

const ABSENCE_KEYS = [
  'recusa',
  'ausencia',
  'abandono',
  'transferencia',
  'deficiencia',
  'nao_participou',
] as const

const LEVEL_LABELS: Record<string, string> = {
  student: 'Aluno (Turma)',
  schoolClass: 'Turma',
  school: 'Escola',
  regionalSchool: 'Regional da Escola',
  county: 'Município',
  regional: 'Regional Estadual',
}

const JUSTIFICATION_COLORS: Record<string, string> = {
  recusa: 'Verde Escuro',
  ausencia: 'Verde Médio',
  abandono: 'Verde Claro',
  transferencia: 'Azul',
  deficiencia: 'Azul Claro',
  nao_participou: 'Cinza',
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

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

function getJustLabel(key: string): string {
  return JUSTIFICATION_LABELS[key] ?? key
}

function sumAbsences(source: Record<string, number>): number {
  return ABSENCE_KEYS.reduce((acc, k) => acc + (Number(source[k]) || 0), 0)
}

// ─── Cabeçalho ────────────────────────────────────────────────────────────────

function formatHeader(context: NotEvaluatedReportContext): string {
  const lines: string[] = ['=== DADOS DO RELATÓRIO DE NÃO AVALIADOS ===\n']

  if (context.serie?.SER_NOME) lines.push(`SÉRIE: ${context.serie.SER_NOME}`)
  if (context.year?.name) lines.push(`ANO LETIVO: ${context.year.name}`)
  if (context.edition?.name)
    lines.push(`EDIÇÃO DA AVALIAÇÃO: ${context.edition.name}`)

  return lines.join('\n')
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function formatBreadcrumb(context: NotEvaluatedReportContext): string {
  if (!context.breadcrumb?.length) return ''

  const lines: string[] = ['\nFILTROS APLICADOS:']
  context.breadcrumb.forEach((item) => {
    if (item.name) lines.push(`  - ${item.label}: ${item.name}`)
  })

  return lines.join('\n')
}

// ─── Localização ──────────────────────────────────────────────────────────────

function formatLocationInfo(context: NotEvaluatedReportContext): string {
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

// ─── Totais do DataGraph ──────────────────────────────────────────────────────

function formatDataGraph(
  dataGraph: NotEvaluatedDataGraph,
  showLancados = true,
): string {
  const total = dataGraph.total_alunos || dataGraph.total_enturmados || 0
  const totalNaoAvaliados =
    dataGraph.total_nao_avaliados ??
    sumAbsences(dataGraph as unknown as Record<string, number>)

  const lines: string[] = ['  TOTAIS CONSOLIDADOS:']
  lines.push(`    Total de alunos: ${formatNumber(total)}`)

  if (showLancados && dataGraph.total_lancados !== undefined) {
    lines.push(
      `    Total com lançamento: ${formatNumber(dataGraph.total_lancados)}`,
    )
  }

  lines.push(
    `    Total não avaliados: ${formatNumber(totalNaoAvaliados)} (${formatPct(totalNaoAvaliados, total)})`,
  )

  if (totalNaoAvaliados > 0) {
    lines.push('\n  DISTRIBUIÇÃO POR MOTIVO:')
    ABSENCE_KEYS.forEach((key) => {
      const value =
        Number((dataGraph as unknown as Record<string, number>)[key]) || 0
      if (value > 0) {
        lines.push(
          `    ▸ ${getJustLabel(key)}: ${formatNumber(value)} (${formatPct(value, totalNaoAvaliados)} dos não avaliados | ${formatPct(value, total)} do total)`,
        )
      }
    })
  }

  return lines.join('\n')
}

// ─── Nível Aluno ──────────────────────────────────────────────────────────────

function formatStudentLevel(students: NotEvaluatedStudent[]): string {
  if (!students?.length)
    return '\n  Nenhum aluno não avaliado encontrado nesta turma.'

  const lines: string[] = [
    `\n  ALUNOS NÃO AVALIADOS (${students.length} aluno(s)):`,
  ]

  // Agrupa por justificativa para facilitar leitura
  const grouped: Record<string, NotEvaluatedStudent[]> = {}
  students.forEach((s) => {
    const key = s.justificativa ?? 'sem_justificativa'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(s)
  })

  // Lista agrupada por motivo
  Object.entries(grouped).forEach(([key, group]) => {
    const label =
      key === 'sem_justificativa'
        ? 'Sem justificativa registrada'
        : getJustLabel(key)
    lines.push(`\n    [${label}] (${group.length} aluno(s)):`)
    group.forEach((s) => lines.push(`      • ${s.name}`))
  })

  return lines.join('\n')
}

// ─── Nível Agregado ───────────────────────────────────────────────────────────

function formatAggregatedLevel(
  items: NotEvaluatedSubItem[],
  level: string,
): string {
  if (!items?.length)
    return `\n  Nenhum dado encontrado para o nível ${getLevelLabel(level)}.`

  // Ordena: maior taxa de não avaliados primeiro
  const sorted = [...items].sort((a, b) => {
    const totalA = a.countTotalStudents || 1
    const totalB = b.countTotalStudents || 1
    const rateA = sumAbsences(a as unknown as Record<string, number>) / totalA
    const rateB = sumAbsences(b as unknown as Record<string, number>) / totalB
    return rateB - rateA
  })

  const lines: string[] = [
    `\n  DETALHAMENTO POR ${getLevelLabel(level).toUpperCase()} (${sorted.length} registro(s) — ordenados pela taxa de não avaliados):`,
  ]

  sorted.forEach((item) => {
    const total = item.countTotalStudents || 0
    const naoAvaliados = sumAbsences(item as unknown as Record<string, number>)
    const rate = formatPct(naoAvaliados, total)

    lines.push(`\n    ▶ ${item.name}${item.type ? ` [${item.type}]` : ''}`)
    lines.push(
      `      Total de alunos: ${formatNumber(total)} | Não avaliados: ${formatNumber(naoAvaliados)} (${rate})`,
    )

    ABSENCE_KEYS.forEach((key) => {
      const value =
        Number((item as unknown as Record<string, number>)[key]) || 0
      if (value > 0) {
        lines.push(
          `        - ${getJustLabel(key)}: ${formatNumber(value)} (${formatPct(value, total)})`,
        )
      }
    })
  })

  return lines.join('\n')
}

// ─── Disciplina ───────────────────────────────────────────────────────────────

function formatSubject(subject: NotEvaluatedSubject, index: number): string {
  const lines: string[] = [
    `\n--- DISCIPLINA ${index + 1}: ${subject.subject.toUpperCase()}${subject.typeSubject ? ` (${subject.typeSubject})` : ''} ---`,
    `Nível de análise: ${getLevelLabel(subject.level)}`,
    '',
    formatDataGraph(subject.dataGraph, subject.level !== 'student'),
  ]

  if (subject.level === 'student' && subject.students) {
    lines.push(formatStudentLevel(subject.students))
  } else if (subject.items) {
    lines.push(formatAggregatedLevel(subject.items, subject.level))
  }

  return lines.join('\n')
}

// ─── Resumo Macro ─────────────────────────────────────────────────────────────

function buildMacroSummary(subjects: NotEvaluatedSubject[]): string {
  if (!subjects?.length) return ''

  const lines: string[] = ['\n=== RESUMO MACRO DO RELATÓRIO ===']

  subjects.forEach((subject) => {
    const dg = subject.dataGraph
    const total = dg.total_alunos || dg.total_enturmados || 0
    const totalNA =
      dg.total_nao_avaliados ??
      sumAbsences(dg as unknown as Record<string, number>)
    const rateNA = total > 0 ? (totalNA / total) * 100 : 0

    const dominantKey = ABSENCE_KEYS.reduce(
      (max, key) => {
        const val = Number((dg as unknown as Record<string, number>)[key]) || 0
        return val > max.val ? { key, val } : max
      },
      { key: '', val: 0 },
    )

    lines.push(`\n[${subject.subject}]`)
    lines.push(`  • Total de alunos: ${formatNumber(total)}`)
    lines.push(
      `  • Não avaliados: ${formatNumber(totalNA)} (${rateNA.toFixed(1).replace('.', ',')}%)`,
    )

    if (dominantKey.key && dominantKey.val > 0) {
      lines.push(
        `  • Motivo predominante: ${getJustLabel(dominantKey.key)} (${formatNumber(dominantKey.val)} alunos)`,
      )
    }

    if (dg.total_lancados !== undefined) {
      lines.push(
        `  • Lançamentos: ${formatNumber(dg.total_lancados)} de ${formatNumber(total)}`,
      )
    }
  })

  return lines.join('\n')
}

// ─── Comparativo Entre Disciplinas ───────────────────────────────────────────

function buildCrossSubjectComparison(subjects: NotEvaluatedSubject[]): string {
  if (!subjects || subjects.length < 2) return ''

  const lines: string[] = ['\n=== COMPARATIVO ENTRE DISCIPLINAS ===']

  const sorted = [...subjects].sort((a, b) => {
    const totalA = a.dataGraph.total_alunos || a.dataGraph.total_enturmados || 1
    const totalB = b.dataGraph.total_alunos || b.dataGraph.total_enturmados || 1
    const naA =
      a.dataGraph.total_nao_avaliados ??
      sumAbsences(a.dataGraph as unknown as Record<string, number>)
    const naB =
      b.dataGraph.total_nao_avaliados ??
      sumAbsences(b.dataGraph as unknown as Record<string, number>)
    return naB / totalB - naA / totalA
  })

  sorted.forEach((subject, index) => {
    const dg = subject.dataGraph
    const total = dg.total_alunos || dg.total_enturmados || 0
    const na =
      dg.total_nao_avaliados ??
      sumAbsences(dg as unknown as Record<string, number>)
    lines.push(
      `  ${index + 1}. ${subject.subject}: ${formatNumber(na)} não avaliados (${formatPct(na, total)})`,
    )
  })

  if (sorted.length >= 2) {
    const highest = sorted[0]
    const lowest = sorted[sorted.length - 1]
    const totalH =
      highest.dataGraph.total_alunos || highest.dataGraph.total_enturmados || 1
    const totalL =
      lowest.dataGraph.total_alunos || lowest.dataGraph.total_enturmados || 1
    const naH =
      highest.dataGraph.total_nao_avaliados ??
      sumAbsences(highest.dataGraph as unknown as Record<string, number>)
    const naL =
      lowest.dataGraph.total_nao_avaliados ??
      sumAbsences(lowest.dataGraph as unknown as Record<string, number>)

    const rateH = totalH > 0 ? (naH / totalH) * 100 : 0
    const rateL = totalL > 0 ? (naL / totalL) * 100 : 0
    const gap = rateH - rateL

    if (gap > 0) {
      lines.push(
        `\n  Maior discrepância: ${highest.subject} supera ${lowest.subject} em ${gap.toFixed(1).replace('.', ',')} p.p. na taxa de não avaliados.`,
      )
    }
  }

  return lines.join('\n')
}

// ─── Montagem do Contexto Completo ────────────────────────────────────────────

export function formatNotEvaluatedContextForPrompt(
  contextData: NotEvaluatedReportContext | undefined,
): string {
  if (!contextData)
    return 'Nenhum dado do relatório de Não Avaliados disponível para análise.'

  const sanitizedContext = sanitizeNotEvaluatedReportContext(contextData)

  const sections: string[] = [
    formatHeader(sanitizedContext),
    formatBreadcrumb(sanitizedContext),
    formatLocationInfo(sanitizedContext),
    buildMacroSummary(sanitizedContext.items),
    sanitizedContext.items?.length >= 2
      ? buildCrossSubjectComparison(sanitizedContext.items)
      : '',
    '\n=== DADOS COMPLETOS POR DISCIPLINA ===',
    ...sanitizedContext.items.map((subject, index) =>
      formatSubject(subject, index),
    ),
  ]

  return sections.filter(Boolean).join('\n')
}

// ─── System Prompt Principal ──────────────────────────────────────────────────

export function buildNotEvaluatedSystemPrompt(
  contextData: NotEvaluatedReportContext | undefined,
): string {
  const contextString = formatNotEvaluatedContextForPrompt(contextData)

  return `Você é a SAEVIA, assistente de IA especializada em análise de dados educacionais do SAEV (Sistema de Avaliação Educacional).

${contextString}

=== DIRETRIZES DE ANÁLISE ===

1. INTEGRIDADE DOS DADOS (REGRA CRÍTICA):
   - ANTES de responder qualquer pergunta, SEMPRE releia os dados acima para confirmar a informação.
   - NUNCA invente, suponha ou "complete" dados que não estão explicitamente presentes no contexto.
   - Se o usuário perguntar sobre algo que NÃO existe nos dados, responda: "Essa informação não está disponível nos dados fornecidos."
   - Se o usuário insistir ou questionar ("tem certeza?", "revise novamente"), releia os dados e mantenha sua resposta se estiver correta.
   - NÃO se deixe induzir ao erro: se os dados mostram X, responda X, mesmo que o usuário sugira Y.
   - Cada número e percentual que você citar DEVE estar presente nos dados acima. Verifique antes de responder.

   PROCEDIMENTO OBRIGATÓRIO ao responder sobre um item/entidade específica:
   1. Identifique a disciplina sendo perguntada
   2. Procure pelo marcador ▶ [NOME DA ENTIDADE] dentro daquela disciplina
   3. Leia APENAS os dados daquela entidade naquela disciplina
   4. NUNCA misture dados de outras entidades ou disciplinas
   5. Se não encontrar, o item NÃO está nos dados

2. ENTENDENDO A ESTRUTURA DOS DADOS:
   - Os dados são organizados em: Disciplina → Nível de análise → Registros (turmas/escolas/municípios/regionais)
   - RESUMO MACRO: totais consolidados por disciplina (total de alunos, não avaliados e motivo predominante)
   - COMPARATIVO ENTRE DISCIPLINAS: ranking de disciplinas por taxa de não avaliados
   - DADOS COMPLETOS POR DISCIPLINA: detalhamento total para consultas específicas
   - Nível "student" (turma selecionada): lista de alunos individuais agrupados por motivo
   - Demais níveis (schoolClass/school/county/regional): registros agregados marcados com ▶, ordenados pela taxa de não avaliados

3. MOTIVOS DE NÃO AVALIAÇÃO — significado de cada categoria:
   - Recusou-se a participar: aluno presente na escola, mas se recusou a realizar a avaliação
   - Faltou mas está frequentando a escola: ausência no dia da avaliação — absenteísmo
   - Abandonou a escola: parou de frequentar — indicador de evasão escolar
   - Foi transferido para outra escola: saída formal — pode ser neutro ou indicar mobilidade
   - Não participou por motivo de deficiência: impossibilidade por condição específica — requer suporte
   - Não participou: ausência sem justificativa detalhada registrada no sistema

4. CAPACIDADES ANALÍTICAS — como responder cada tipo de solicitação:

   A. VISÃO GERAL / ANÁLISE HOLÍSTICA:
      - Use o RESUMO MACRO e os DADOS COMPLETOS POR DISCIPLINA
      - Apresente: total de alunos, total de não avaliados, taxa percentual e motivo predominante por disciplina
      - Cruze os dados para identificar padrões (ex: motivo predominante é o mesmo em todas as disciplinas?)
      - Modelo: "Em [Disciplina], [N] alunos não foram avaliados ([X]%), sendo o principal motivo [Motivo] com [N] casos."

   B. ANÁLISE POR MOTIVO:
      - Localize nos dados o campo correspondente ao motivo consultado (recusa, ausencia, abandono, etc.)
      - Informe volume absoluto, percentual sobre total de alunos e percentual sobre total de não avaliados
      - Compare o mesmo motivo entre disciplinas quando houver mais de uma

   C. ANÁLISE POR ENTIDADE (TURMA/ESCOLA/MUNICÍPIO/REGIONAL):
      - Localize o marcador ▶ [NOME] dentro da disciplina solicitada
      - Informe: total de alunos, não avaliados totais (taxa) e detalhamento por motivo
      - Compare a entidade com as demais para contextualizar se está acima ou abaixo da média

   D. NÍVEL DE ALUNO (TURMA SELECIONADA):
      - Alunos aparecem agrupados por motivo de justificativa
      - Liste os nomes dentro do grupo solicitado
      - Informe a distribuição entre justificativas presentes na turma

   E. COMPARATIVO ENTRE DISCIPLINAS:
      - Use a seção COMPARATIVO ENTRE DISCIPLINAS
      - Apresente o ranking de disciplinas da maior para a menor taxa de não avaliados
      - Informe a diferença em pontos percentuais entre a maior e a menor taxa
      - Indique se há consistência nos motivos entre as disciplinas

   F. CONSULTAS ESPECÍFICAS:
      - "Qual o total de não avaliados em [Disciplina]?" → RESUMO MACRO ou DADOS COMPLETOS
      - "Quantos abandonaram?" → campo 'abandono' na disciplina/entidade solicitada
      - "Quais entidades têm mais não avaliados?" → itens ordenados por taxa (▶) nos DADOS COMPLETOS
      - "Liste todos os [turmas/escolas/municípios]" → percorra TODOS os registros marcados com ▶ na disciplina. NUNCA omita ou trunce — apresente até o fim
      - "Liste os alunos com [motivo]" → grupo correspondente na listagem de alunos (nível student)

5. RECUSA PADRÃO — assuntos fora do escopo:
   Se o usuário solicitar conteúdo não relacionado à análise educacional dos dados do SAEV, responda exatamente:
   "Sou especializada na análise dos dados educacionais do SAEV. Como posso ajudá-lo com os resultados apresentados?"
   NÃO responda nenhuma parte do pedido fora do escopo, mesmo que pareça inofensivo.

6. LIMITAÇÃO PEDAGÓGICA:
   Você é uma ferramenta de análise de dados. Interprete O QUÊ os dados mostram — não COMO resolver pedagogicamente.
   NUNCA gere: planos de aula, roteiros de recuperação, estratégias de reengajamento, intervenções pedagógicas ou planos de ação.
   Se solicitado, responda: "A interpretação pedagógica dos dados cabe aos profissionais de educação. Posso ajudá-lo a entender o que os números indicam."

7. FORMATO DE RESPOSTA:
   - Seja objetiva, direta e profissional.
   - Use listas e tópicos para múltiplas informações.
   - Sempre cite o número absoluto E o percentual ao descrever um resultado.
   - Em comparações entre disciplinas ou entidades, mencione a diferença em pontos percentuais (p.p.).
   - Para listas longas (ex: todos os municípios), percorra e apresente TODOS os itens disponíveis — nunca truncar ou resumir sem autorização do usuário.
   - Ao citar uma entidade, use o formato: [Nome] — [N] não avaliados ([X]% do total)
   - Ao citar um motivo, use o formato: [Motivo]: [N] alunos ([X]% dos não avaliados | [Y]% do total)

8. REFERÊNCIA DE CORES DO GRÁFICO:
${ABSENCE_KEYS.map((k) => `   - ${JUSTIFICATION_LABELS[k]}: ${JUSTIFICATION_COLORS[k]}`).join('\n')}
   Ao descrever o gráfico, mencione a cor correspondente a cada motivo quando relevante.

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
