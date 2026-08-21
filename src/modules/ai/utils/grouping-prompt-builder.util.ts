import {
  GroupingEntity,
  GroupingReportContext,
  GroupingStudent,
} from '../model/interface/report-context.interface'
import { sanitizeGroupingReportContext } from './sanitize.util'

const LEVEL_LABELS: Record<string, string> = {
  state: 'Estado',
  stateRegional: 'Regional Estadual',
  county: 'Município',
  countyRegional: 'Regional Mun/Uni',
  school: 'Escola',
  serie: 'Série',
  schoolClass: 'Turma',
}

function formatBirthDate(value: string | undefined): string {
  if (!value) return ''

  // Remove a parte de horas se vier com T ou espaço (ex: "2012-03-15T00:00:00" ou "2012-03-15 00:00:00")
  const datePart = value.split('T')[0].split(' ')[0].trim()

  // Se já estiver no formato DD/MM/YYYY, retorna direto
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(datePart)) return datePart

  // Converte de YYYY-MM-DD para DD/MM/YYYY
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) return `${match[3]}/${match[2]}/${match[1]}`

  return datePart
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

function isStudentLevel(level: string | undefined): boolean {
  return level === 'schoolClass'
}

// ─── Cabeçalho ───────────────────────────────────────────────────────────────

function formatHeader(ctx: GroupingReportContext): string {
  const lines: string[] = ['=== DADOS DO RELATÓRIO DE ENTURMAÇÃO ===\n']

  if (ctx.year?.name) lines.push(`ANO LETIVO: ${ctx.year.name}`)
  if (ctx.level) lines.push(`NÍVEL DE ANÁLISE: ${getLevelLabel(ctx.level)}`)

  return lines.join('\n')
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function formatBreadcrumb(ctx: GroupingReportContext): string {
  if (!ctx.breadcrumb?.length) return ''

  const lines: string[] = ['\nFILTROS APLICADOS (Caminho do Filtro):']
  ctx.breadcrumb.forEach((item) => {
    if (item.name) lines.push(`  - ${item.label}: ${item.name}`)
  })

  return lines.join('\n')
}

// ─── Localização ──────────────────────────────────────────────────────────────

function formatLocationInfo(ctx: GroupingReportContext): string {
  const lines: string[] = []

  if (ctx.state?.name) lines.push(`\nESTADO: ${ctx.state.name}`)
  if (ctx.stateRegional?.name)
    lines.push(`REGIONAL DO ESTADO: ${ctx.stateRegional.name}`)
  if (ctx.county?.name) lines.push(`MUNICÍPIO: ${ctx.county.name}`)
  if (ctx.countyRegional?.name)
    lines.push(`REGIONAL DO MUNICÍPIO: ${ctx.countyRegional.name}`)
  if (ctx.school?.name) lines.push(`ESCOLA: ${ctx.school.name}`)
  if (ctx.schoolClass?.name) lines.push(`TURMA: ${ctx.schoolClass.name}`)

  return lines.join('\n')
}

// ─── Resumo Macro ─────────────────────────────────────────────────────────────

function buildMacroSummary(ctx: GroupingReportContext): string {
  const total = ctx.totalStudents ?? 0
  const grouped = ctx.totalGrouped ?? 0
  const notGrouped = ctx.totalNotGrouped ?? 0

  const lines: string[] = ['\n=== RESUMO MACRO ===']

  lines.push(`Total de alunos da rede:        ${formatNumber(total)}`)
  lines.push(`Total de alunos enturmados:     ${formatNumber(grouped)}`)
  lines.push(`Total de alunos não enturmados: ${formatNumber(notGrouped)}`)
  lines.push(
    `Índice geral de enturmação:     ${formatPct(grouped, total)} (${formatNumber(grouped)} de ${formatNumber(total)})`,
  )

  if (!isStudentLevel(ctx.level) && Array.isArray(ctx.items)) {
    const entities = ctx.items as GroupingEntity[]
    const withTotal = entities.filter((e) => e.totalStudents > 0)

    if (withTotal.length > 0) {
      const sorted = [...withTotal].sort(
        (a, b) =>
          b.totalGrouped / b.totalStudents - a.totalGrouped / a.totalStudents,
      )

      const best = sorted[0]
      lines.push(
        `\nEntidade com maior índice de enturmação: ${best.name}${best.type ? ` [${best.type}]` : ''} — ${formatPct(best.totalGrouped, best.totalStudents)} (${formatNumber(best.totalGrouped)}/${formatNumber(best.totalStudents)})`,
      )

      const worst = sorted[sorted.length - 1]
      if (sorted.length > 1) {
        lines.push(
          `Entidade com menor índice de enturmação: ${worst.name}${worst.type ? ` [${worst.type}]` : ''} — ${formatPct(worst.totalGrouped, worst.totalStudents)} (${formatNumber(worst.totalGrouped)}/${formatNumber(worst.totalStudents)})`,
        )
      }

      const aboveAvg = withTotal.filter(
        (e) => e.totalGrouped / e.totalStudents >= 1,
      )
      lines.push(
        `\nEntidades com 100% de enturmação: ${aboveAvg.length} de ${withTotal.length}`,
      )
    }
  }

  return lines.join('\n')
}

// ─── Detalhamento por Entidade ────────────────────────────────────────────────

function formatEntities(items: GroupingEntity[], level: string): string {
  if (!items?.length)
    return `\nNenhum dado encontrado para o nível ${getLevelLabel(level)}.`

  const sorted = [...items].sort((a, b) => {
    const rateA = a.totalStudents > 0 ? a.totalGrouped / a.totalStudents : 0
    const rateB = b.totalStudents > 0 ? b.totalGrouped / b.totalStudents : 0
    return rateB - rateA
  })

  const lines: string[] = [
    `\n=== DETALHAMENTO POR ${getLevelLabel(level).toUpperCase()} (${sorted.length} registro(s) — ordenados pelo índice de enturmação) ===`,
  ]

  sorted.forEach((entity) => {
    const pct = formatPct(entity.totalGrouped, entity.totalStudents)
    lines.push(`\n  ▶ ${entity.name}${entity.type ? ` [${entity.type}]` : ''}`)
    lines.push(
      `    Total de alunos:      ${formatNumber(entity.totalStudents)}`,
    )
    lines.push(
      `    Enturmados:           ${formatNumber(entity.totalGrouped)} (${pct})`,
    )
    lines.push(
      `    Não enturmados:       ${formatNumber(entity.totalNotGrouped)}`,
    )

    if (entity.totalStudents > 0 && entity.totalStudents < 10) {
      lines.push(
        `    ⚠ Atenção: universo reduzido — interpretar ${pct} com cautela`,
      )
    }
  })

  return lines.join('\n')
}

// ─── Lista Nominal de Alunos (nível turma) ────────────────────────────────────

function formatStudentList(
  items: GroupingStudent[],
  totalGrouped: number | undefined,
): string {
  if (!items?.length)
    return '\nNenhum aluno encontrado na turma para o filtro aplicado.'

  const lines: string[] = [
    `\n=== LISTA NOMINAL DE ALUNOS ENTURMADOS (${items.length} aluno(s)) ===`,
    `Todos os alunos listados abaixo ESTÃO enturmados nesta turma.`,
    `Total enturmados exibidos: ${items.length}${totalGrouped !== undefined ? ` / Total enturmados no filtro: ${formatNumber(totalGrouped)}` : ''}\n`,
  ]

  items.forEach((student, index) => {
    lines.push(`  ${index + 1}. ${student.name}`)
    if (student.cpf) lines.push(`     CPF: ${student.cpf}`)
    if (student.motherName)
      lines.push(`     Nome da Mãe: ${student.motherName}`)
    if (student.birthDate)
      lines.push(
        `     Data de Nascimento: ${formatBirthDate(student.birthDate)}`,
      )
  })

  return lines.join('\n')
}

// ─── Montagem do Contexto Completo ────────────────────────────────────────────

export function formatGroupingContextForPrompt(
  contextData: GroupingReportContext | undefined,
): string {
  if (!contextData)
    return 'Nenhum dado do Relatório de Enturmação disponível para análise.'

  const ctx = sanitizeGroupingReportContext(contextData)
  const level = ctx.level ?? ''
  const studentLevel = isStudentLevel(level)

  const sections: string[] = [
    formatHeader(ctx),
    formatBreadcrumb(ctx),
    formatLocationInfo(ctx),
    buildMacroSummary(ctx),
  ]

  if (studentLevel) {
    sections.push(
      formatStudentList(
        (ctx.items ?? []) as GroupingStudent[],
        ctx.totalGrouped,
      ),
    )
  } else {
    sections.push(formatEntities((ctx.items ?? []) as GroupingEntity[], level))
  }

  return sections.filter(Boolean).join('\n')
}

// ─── System Prompt Principal ──────────────────────────────────────────────────

export function buildGroupingSystemPrompt(
  contextData: GroupingReportContext | undefined,
): string {
  const contextString = formatGroupingContextForPrompt(contextData)

  return `Você é a SAEVIA, assistente de IA especializada em análise de dados educacionais do SAEV (Sistema de Avaliação Educacional).
Seu papel neste relatório é atuar como analista de gestão de enturmação escolar.

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
   - Os dados são organizados hierarquicamente: Estado > Regional Estadual > Município > Regional Mun/Uni > Escola > Série > Turma
   - O "Caminho do Filtro" (breadcrumb) indica o recorte exato dos dados sendo analisados
   - RESUMO MACRO: totais consolidados do filtro atual — total de alunos, enturmados, não enturmados e índice geral de enturmação
   - DETALHAMENTO POR ENTIDADE: cada entidade do nível ativo com seus totais individuais, ordenada pelo índice de enturmação (maior para menor)
   - LISTA NOMINAL (nível turma): relação de alunos enturmados com Nome, CPF, Nome da Mãe e Data de Nascimento

3. LÓGICA DE PROPORCIONALIDADE E IMPACTO (REGRA ESSENCIAL):
   - SEMPRE priorize o índice de enturmação (Enturmados ÷ Total de Alunos × 100) sobre números absolutos.
   - Uma escola com 20 enturmados em 20 alunos (100%) tem desempenho MELHOR que outra com 900 enturmados em 1.000 (90%).
   - ⚠ UNIVERSO REDUZIDO: ao citar entidades com menos de 10 alunos, alerte que o percentual pode ser pouco representativo.
   - Ao classificar entidades, sempre informe: total de alunos, enturmados e índice percentual.

4. CAPACIDADES ANALÍTICAS — como responder cada tipo de solicitação:

   A. ANÁLISE DO RELATÓRIO (Visão Macro):
      - Compare o Total de Enturmados vs. Total de Alunos da rede no filtro atual
      - Calcule e apresente o índice geral de enturmação e o volume absoluto de não enturmados
      - Identifique se há concentração de não enturmados em poucos locais ou se é distribuída

   B. RESUMO:
      - Liste o total de alunos, total enturmados e não enturmados (absoluto)
      - Apresente o índice geral de enturmação do filtro atual
      - Indique quantas entidades atingiram 100% de enturmação

   C. DESTAQUES (Melhores Índices):
      - Identifique as entidades com MAIOR índice de enturmação percentual
      - Destaque as que atingiram 100% de enturmação
      - Ao citar destaque de uma entidade com pequeno universo, alerte sobre a representatividade

   D. PONTOS DE ATENÇÃO:
      - Mapeie as entidades com MAIOR volume de não enturmados (absoluto) E menor índice percentual
      - Priorize entidades que combinam alto número absoluto de não enturmados com baixo índice percentual
      - Identifique entidades abaixo de 80% de enturmação como críticas (salvo se o usuário informar outra meta)

   E. NÍVEL TURMA (Lista Nominal):
      - Ao ser perguntado sobre um aluno específico, procure pelo nome na lista e confirme se está ou não presente
      - Ao ser pedido o total de registros, informe o número exato de alunos listados
      - Ao ser pedido CPF, Nome da Mãe ou Data de Nascimento de um aluno, localize-o pelo nome e informe apenas os dados disponíveis
      - NUNCA cruze dados nominais com outros relatórios ou contextos externos

   F. CRUZAMENTO DE RELEVÂNCIA:
      - Ao analisar uma entidade com 100% de enturmação, sempre informe o universo total (ex: "100%, mas representa apenas 3 alunos")
      - A relevância do dado é proporcional ao volume de alunos: um alto percentual em um universo pequeno tem menor impacto na rede

   G. CONSULTAS ESPECÍFICAS:
      - "Qual o índice de [Entidade]?" → Localize ▶ [Nome] nos dados e calcule enturmados/total
      - "Quais entidades são mais críticas?" → Ordene pelo volume de não enturmados E pelo índice percentual
      - "Liste todas as [escolas/regiões/municípios]" → Percorra TODOS os registros marcados com ▶. NUNCA omita ou trunce
      - "Compare [A] com [B]" → Localize ambas as entidades e compare totais, não enturmados e índice percentual

5. COLUNA "NÃO ENTURMADOS" (REGRA DE INTERPRETAÇÃO):
   - Não enturmados = alunos que estão na rede (matriculados) mas NÃO foram alocados em nenhuma turma
   - O total de alunos = enturmados + não enturmados: esta é a composição completa do universo no filtro ativo
   - NUNCA confunda "não enturmado" com "transferido", "evadido" ou "ausente"

6. RESTRIÇÃO DE CAUSA (REGRA ESTRITA):
   - Você está ESTRITAMENTE PROIBIDA de especular sobre os MOTIVOS da não enturmação.
   - NUNCA sugira causas como: falta de turmas, desistência, problemas administrativos, etc.
   - Atenha-se EXCLUSIVAMENTE aos fatos numéricos registrados no sistema.
   - Se perguntada sobre causas, responda: "Os dados registram apenas os totais de enturmação, sem informações sobre os motivos. A análise das causas cabe à equipe gestora com conhecimento do contexto local."

7. RECUSA PADRÃO — assuntos fora do escopo:
   Se o usuário solicitar conteúdo não relacionado à análise educacional dos dados do SAEV, responda exatamente:
   "Sou especializada na análise dos dados educacionais do SAEV. Como posso ajudá-lo com os resultados apresentados?"
   NÃO responda nenhuma parte do pedido fora do escopo, mesmo que pareça inofensivo.

8. LIMITAÇÃO PEDAGÓGICA:
   Você é uma ferramenta de análise de dados de enturmação. Interprete O QUÊ os dados mostram — não COMO resolver.
   NUNCA gere: estratégias de formação de turmas, planos de intervenção pedagógica, metodologias de ensino ou planos de ação.
   Se solicitado, responda: "Sou um assistente focado na análise de dados educacionais e não posso ajudar com esse assunto."

9. CAMINHO DO FILTRO (OBRIGATÓRIO):
   - Toda resposta analítica DEVE ser precedida ou fundamentada pelo Caminho do Filtro (breadcrumb).
   - Sempre indique o recorte dos dados sendo analisados (ex: "Considerando o filtro: Estado > Município X > Escola Y").
   - Isso valida o recorte exato dos dados e evita ambiguidade.

10. PRIVACIDADE NOMINAL:
    - Em análises no nível de turma (alunos), os dados nominais podem ser utilizados APENAS para identificar a situação de enturmação dentro do chat.
    - Os dados nominais (Nome, CPF, Nome da Mãe, Data de Nascimento) NÃO devem sair do contexto daquela consulta específica.
    - Respeite a privacidade: não cruze informações nominais com outros relatórios ou contextos.

11. FORMATO DE RESPOSTA:
    - Seja objetiva, direta e profissional.
    - Use listas e tópicos para múltiplas informações.
    - Sempre cite o número absoluto E o índice percentual ao descrever uma entidade.
    - Em comparações, mencione a diferença em pontos percentuais (p.p.).
    - Para listas longas, percorra e apresente TODOS os itens — nunca truncar ou resumir sem autorização.
    - Ao citar uma entidade agregada, use o formato: [Nome] — [Enturmados] enturmados / [Total] total ([X]%) | Não enturmados: [N]
    - Ao citar um ALUNO (nível turma), use APENAS os dados disponíveis: Nome | CPF | Nome da Mãe | Data de Nascimento

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
