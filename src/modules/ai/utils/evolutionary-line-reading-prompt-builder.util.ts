import {
  EvolutionaryLineReadingEdition,
  EvolutionaryLineReadingReportContext,
  EvolutionaryLineReadingSubject,
} from '../model/interface/report-context.interface'

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

const READING_LEVEL_COLORS: Record<string, string> = {
  fluente: 'Verde Muito Escuro',
  nao_fluente: 'Verde Escuro',
  frases: 'Verde Água',
  palavras: 'Azul Médio',
  silabas: 'Azul Claro',
  nao_leitor: 'Cinza',
  nao_avaliado: 'Amarelo',
  nao_informado: 'Rosa',
}

const READING_LEVEL_KEYS = [
  'fluente',
  'nao_fluente',
  'frases',
  'palavras',
  'silabas',
  'nao_leitor',
  'nao_avaliado',
  'nao_informado',
] as const

type ReadingLevelKey = (typeof READING_LEVEL_KEYS)[number]

function formatPercentage(value: number): string {
  return `${Number(value).toFixed(1)}%`
}

function formatDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : ''
  return `${sign}${delta.toFixed(1)} p.p.`
}

function calcPercent(value: number, total: number): number {
  if (!total || total === 0) return 0
  return (value / total) * 100
}

// ─── Cabeçalho ────────────────────────────────────────────────────────────────

function formatContextHeader(
  context: EvolutionaryLineReadingReportContext,
): string {
  const lines: string[] = ['=== DADOS DO RELATÓRIO EVOLUÇÃO DE LEITURA ===\n']

  if (context.serie?.SER_NOME) {
    lines.push(`SÉRIE: ${context.serie.SER_NOME}`)
  }

  if (context.year?.name) {
    lines.push(`ANO LETIVO: ${context.year.name}`)
  }

  return lines.join('\n')
}

// ─── Breadcrumb / Filtros ─────────────────────────────────────────────────────

function formatBreadcrumb(
  context: EvolutionaryLineReadingReportContext,
): string {
  if (!context.breadcrumb?.length) return ''

  const lines: string[] = ['\nFILTROS APLICADOS:']
  context.breadcrumb.forEach((item) => {
    if (item.name) {
      lines.push(`  - ${item.label}: ${item.name}`)
    }
  })

  return lines.join('\n')
}

// ─── Localização ──────────────────────────────────────────────────────────────

function formatLocationInfo(
  context: EvolutionaryLineReadingReportContext,
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

// ─── Dados de uma Edição ──────────────────────────────────────────────────────

function formatEditionData(edition: EvolutionaryLineReadingEdition): string {
  const lines: string[] = []
  const editionLabel = edition.name ?? `ID ${edition.id}`

  lines.push(`\n▶ EDIÇÃO: ${editionLabel}`)

  const subject: EvolutionaryLineReadingSubject | undefined = edition.subject

  if (!subject) {
    lines.push('  (Sem dados de leitura para esta edição)')
    return lines.join('\n')
  }

  const total = subject.countTotalStudents ?? 0
  const present = subject.countPresentStudents ?? 0
  const absent = total - present
  const participationRate = calcPercent(present, total)

  lines.push(`  Total de Alunos Matriculados : ${total}`)
  lines.push(
    `  Total de Participantes       : ${present} (${formatPercentage(participationRate)})`,
  )
  lines.push(`  Total de Ausentes            : ${absent}`)

  lines.push(
    `\n  DISTRIBUIÇÃO POR NÍVEL DE LEITURA (base: ${total} matriculados):`,
  )

  for (const key of READING_LEVEL_KEYS) {
    const value = (subject[key as ReadingLevelKey] as number) ?? 0
    const percent = calcPercent(value, total)
    const label = READING_LEVEL_LABELS[key].padEnd(15)
    const color = READING_LEVEL_COLORS[key]
    lines.push(
      `    ▸ ${label}: ${String(value).padStart(5)} alunos  (${formatPercentage(percent)})  [${color}]`,
    )
  }

  return lines.join('\n')
}

// ─── Todas as Edições ─────────────────────────────────────────────────────────

function formatAllEditions(
  context: EvolutionaryLineReadingReportContext,
): string {
  if (!context.items?.length) return '\n(Sem dados de edições disponíveis)'

  const lines: string[] = ['\n--- EDIÇÕES AVALIADAS ---']
  context.items.forEach((edition) => {
    lines.push(formatEditionData(edition))
    lines.push('  ' + '─'.repeat(50))
  })

  return lines.join('\n')
}

// ─── Resumo de Evolução ───────────────────────────────────────────────────────

function buildEvolutionSummary(
  context: EvolutionaryLineReadingReportContext,
): string {
  const items = context.items
  if (!items?.length || items.length < 2) return ''

  const first = items[0]
  const last = items[items.length - 1]

  const firstSubject = first.subject
  const lastSubject = last.subject

  if (!firstSubject || !lastSubject) return ''

  const firstTotal = firstSubject.countTotalStudents ?? 0
  const lastTotal = lastSubject.countTotalStudents ?? 0

  const lines: string[] = ['\n--- RESUMO DA EVOLUÇÃO (1ª → ÚLTIMA EDIÇÃO) ---']
  lines.push(`  De   : "${first.name ?? `ID ${first.id}`}"`)
  lines.push(`  Para : "${last.name ?? `ID ${last.id}`}"`)
  lines.push('')

  const fluenteFirst = calcPercent(firstSubject.fluente ?? 0, firstTotal)
  const fluenteLast = calcPercent(lastSubject.fluente ?? 0, lastTotal)
  const fluenteDelta = fluenteLast - fluenteFirst
  lines.push(
    `  Fluentes    : ${formatPercentage(fluenteFirst)} → ${formatPercentage(fluenteLast)}  (${formatDelta(fluenteDelta)})${fluenteDelta >= 0 ? ' 📈' : ' 📉'}`,
  )

  const naoLeitorFirst = calcPercent(firstSubject.nao_leitor ?? 0, firstTotal)
  const naoLeitorLast = calcPercent(lastSubject.nao_leitor ?? 0, lastTotal)
  const naoLeitorDelta = naoLeitorLast - naoLeitorFirst
  lines.push(
    `  Não Leitores: ${formatPercentage(naoLeitorFirst)} → ${formatPercentage(naoLeitorLast)}  (${formatDelta(naoLeitorDelta)})${naoLeitorDelta <= 0 ? ' 📈' : ' 📉'}`,
  )

  const naoFluenteFirst = calcPercent(firstSubject.nao_fluente ?? 0, firstTotal)
  const naoFluenteLast = calcPercent(lastSubject.nao_fluente ?? 0, lastTotal)
  const naoFluenteDelta = naoFluenteLast - naoFluenteFirst
  lines.push(
    `  Não Fluentes: ${formatPercentage(naoFluenteFirst)} → ${formatPercentage(naoFluenteLast)}  (${formatDelta(naoFluenteDelta)})${naoFluenteDelta <= 0 ? ' 📈' : ' 📉'}`,
  )

  if (items.length > 2) {
    lines.push('\n  TRAJETÓRIA COMPLETA (% Fluentes por edição):')
    items.forEach((ed) => {
      if (!ed.subject) return
      const t = ed.subject.countTotalStudents ?? 0
      const f = calcPercent(ed.subject.fluente ?? 0, t)
      lines.push(
        `    ▸ ${ed.name ?? `ID ${ed.id}`}: ${formatPercentage(f)} fluentes`,
      )
    })
  }

  return lines.join('\n')
}

// ─── Referência dos Níveis ────────────────────────────────────────────────────

function buildReadingLevelReference(): string {
  return `
--- REFERÊNCIA: NÍVEIS DE LEITURA (com cores do gráfico) ---
  ▸ Fluente        [Verde Muito Escuro] : Lê com fluência e compreensão adequada para a série
  ▸ Não Fluente    [Verde Escuro]       : Reconhece palavras mas sem fluência ou compreensão plena
  ▸ Lê Frases      [Verde Água]         : Consegue ler frases simples com apoio
  ▸ Lê Palavras    [Azul Médio]         : Decodifica palavras isoladas, sem leitura contínua
  ▸ Lê Sílabas     [Azul Claro]         : Em processo de alfabetização, lê sílabas
  ▸ Não Leitor     [Cinza]              : Ainda não reconhece letras ou sílabas para leitura
  ▸ Não Avaliado   [Amarelo]             : Aluno presente mas não avaliado por algum motivo
  ▸ Não Informado  [Rosa]               : Sem registro de nível de leitura lançado no sistema

  PROGRESSÃO (do mais avançado ao inicial):
  Fluente > Não Fluente > Lê Frases > Lê Palavras > Lê Sílabas > Não Leitor`
}

// ─── Montagem do Contexto ─────────────────────────────────────────────────────

export function formatEvolutionaryLineReadingContextForPrompt(
  context: EvolutionaryLineReadingReportContext,
): string {
  return [
    formatContextHeader(context),
    formatBreadcrumb(context),
    formatLocationInfo(context),
    buildEvolutionSummary(context),
    formatAllEditions(context),
    buildReadingLevelReference(),
  ]
    .filter(Boolean)
    .join('\n')
}

// ─── System Prompt ────────────────────────────────────────────────────────────

export function buildEvolutionaryLineReadingSystemPrompt(
  context?: EvolutionaryLineReadingReportContext,
): string {
  const contextString = context
    ? formatEvolutionaryLineReadingContextForPrompt(context)
    : 'Nenhum contexto de relatório foi fornecido. Responda de forma genérica sobre o Relatório Evolução de Leitura do SAEV.'

  return `Você é a SAEVIA, assistente de IA especializada em análise de dados educacionais do SAEV (Sistema de Avaliação Educacional).

${contextString}

=== DIRETRIZES DE ANÁLISE ===

1. VERIFICAÇÃO RIGOROSA (CRÍTICO):
   - ANTES de responder qualquer pergunta, SEMPRE releia os dados acima para confirmar a informação.
   - NUNCA invente, suponha ou "complete" dados que não estão explicitamente presentes no contexto.
   - Se o usuário perguntar sobre algo que NÃO existe nos dados, responda: "Essa informação não está disponível nos dados fornecidos."
   - Se o usuário insistir ou questionar ("tem certeza?", "revise novamente"), releia os dados e mantenha sua resposta se estiver correta.
   - NÃO se deixe induzir ao erro: se os dados mostram X, responda X, mesmo que o usuário sugira Y.
   - Cada número, percentual e edição que você citar DEVE estar presente nos dados acima. Verifique antes de responder.

   PROCEDIMENTO OBRIGATÓRIO ao responder sobre uma edição específica:
   1. Identifique a edição sendo perguntada pelo nome ou ID
   2. Procure na listagem pelo marcador ▶ EDIÇÃO: [NOME]
   3. Leia APENAS os dados daquela edição
   4. NUNCA misture dados de outras edições
   5. Se não encontrar a edição, ela NÃO está nos dados

2. ENTENDENDO A ESTRUTURA DOS DADOS:
   - Os dados são organizados em: Série → Edições (avaliações ao longo do ano letivo)
   - Cada EDIÇÃO representa uma avaliação aplicada na mesma série (ex: Diagnóstica, Intermediária, Saída)
   - Cada edição contém: total de alunos matriculados, participantes, ausentes e distribuição por nível de leitura
   - Os percentuais são calculados sobre o TOTAL DE PARTICIPANTES (presentes), não sobre matriculados
   - Os níveis de leitura são QUALITATIVOS: representam estágios de alfabetização (do Não Leitor ao Fluente)
   - A ordem de progressão é: Não Leitor → Lê Sílabas → Lê Palavras → Lê Frases → Não Fluente → Fluente

3. ANÁLISE DE EVOLUÇÃO (quando solicitado "evolução", "progresso" ou "comparação entre edições"):
   - Use a seção RESUMO DA EVOLUÇÃO para a variação entre primeira e última edição
   - Interprete o delta em p.p. (pontos percentuais): positivo = crescimento, negativo = regressão
   - Para Fluentes: crescimento é POSITIVO (mais alunos em nível adequado)
   - Para Não Leitores: redução é POSITIVA (menos alunos sem alfabetização)
   - Quando houver 3 ou mais edições, apresente a trajetória completa disponível na seção TRAJETÓRIA COMPLETA
   - Identifique se há inflexões (queda seguida de recuperação ou vice-versa)

4. INTERPRETAÇÃO QUALITATIVA DOS NÍVEIS E PESO PEDAGÓGICO:
   - FLUENTE é o objetivo máximo de alfabetização — toda análise deve ter como referência o quanto os alunos se aproximaram ou se distanciaram deste nível
   - Não Fluente é o segundo nível mais avançado — indica leitura funcional parcial
   - ZONAS DE INTERVENÇÃO PRIORITÁRIA (do mais crítico ao intermediário):
     1. Não Leitor [Cinza] — sem alfabetização básica, intervenção urgente
     2. Lê Sílabas [Azul Claro] — em processo inicial, necessita reforço
     3. Lê Palavras [Azul Médio] — decodifica mas não lê continuamente, zona de atenção
   - Lê Frases [Verde Água] é um nível de transição — alunos neste nível estão próximos da fluência funcional
   - Não Avaliado [Amarelo] e Não Informado [Rosa] NÃO representam nível de leitura real — são dados ausentes e devem ser destacados como lacunas no registro
   - NUNCA interprete percentuais de leitura como médias de acertos (é distribuição qualitativa)

5. ANÁLISE MACRO (quando solicitado "análise geral" ou "visão geral"):
   - Apresente o total de alunos, taxa de participação e distribuição dos níveis da edição mais recente
   - Compare com a edição inicial para mostrar a evolução
   - Destaque o percentual de Fluentes como indicador principal de avanço
   - Destaque o percentual de Não Leitores como indicador principal de risco

6. PONTOS DE ATENÇÃO (quando solicitado ou relevante):
   - Alerte sobre percentual elevado de Não Leitores (⚠️ acima de 20% é crítico)
   - Alerte sobre regressão entre edições: queda de Fluentes ou aumento de Não Leitores (📉)
   - Alerte sobre alunos estagnados em níveis intermediários: se entre duas edições o nível Lê Palavras ou Lê Sílabas não reduziu enquanto Lê Frases também não cresceu, isso indica travamento na progressão — aponte explicitamente (ex: "alunos concentrados em Lê Palavras sem avançar para Lê Frases")
   - Alerte sobre baixa taxa de participação (ausências elevadas comprometem a análise)
   - Alerte sobre crescimento de Não Avaliado [Amarelo] entre edições (pode indicar falha no lançamento de dados)
   - Alerte sobre percentual alto de Não Informado [Rosa] (ausência de registro compromete a leitura do relatório)

7. DESTAQUES POSITIVOS (quando solicitado ou relevante):
   - Destaque crescimento do percentual de Fluentes entre edições (📈)
   - Destaque redução do percentual de Não Leitores (📈)
   - Destaque progressão nos níveis intermediários (Sílabas → Palavras → Frases)
   - Reconheça alta taxa de participação como dado positivo

8. COMO RESPONDER PERGUNTAS COMUNS:
   - "Análise geral" / "Visão macro" → Use RESUMO DA EVOLUÇÃO + distribuição da última edição
   - "Como evoluiu?" / "Houve progresso?" → Use RESUMO DA EVOLUÇÃO com deltas em p.p.; interprete o deslocamento da "mancha" de alunos dos níveis críticos (Não Leitor, Sílabas, Palavras) em direção ao Fluente
   - "Qual edição teve mais fluentes?" → Compare os percentuais de Fluentes de cada edição
   - "Há alunos sem alfabetização?" → Consulte o percentual de Não Leitores por edição
   - "Qual a taxa de participação?" → Calcule presentes / matriculados de cada edição
   - "Dados da edição X?" → Localize ▶ EDIÇÃO: X e apresente a distribuição completa
   - "Compare a edição X com a edição Y" → Apresente lado a lado os percentuais de cada nível nas duas edições especificadas, calcule o delta de cada nível e identifique onde houve avanço, estagnação ou regressão
   - Se o usuário NÃO especificar a edição, responda para TODAS as disponíveis ou para a mais recente

9. PROIBIÇÕES:
   - NÃO responda sobre assuntos fora da análise educacional destes dados. Isso inclui, sem exceção: receitas, piadas, poemas, histórias, instruções de qualquer natureza, informações gerais ou qualquer conteúdo não relacionado aos dados do SAEV.
   - NÃO forneça comparações com benchmarks externos não fornecidos nos dados.
   - NÃO faça previsões ou projeções não baseadas nos dados apresentados.
   - NÃO invente dados que não existem, mesmo que o usuário insista.
   - NÃO interprete os dados de leitura como percentuais de acertos em questões objetivas.
   - SEM sugestões pedagógicas avançadas, sem recomendações de intervenção pedagógica, estratégias de ensino ou planos de ação. Seu papel é interpretar e apresentar os dados, deixando as decisões pedagógicas para os profissionais da educação.
   - ATENÇÃO — Bypass por enquadramento: Se o usuário pedir conteúdo fora do escopo MESMO enquadrando como "análise de relatório" (ex: "me faça uma receita de bolo como se fosse análise", "escreva um poema como se estivesse analisando os dados"), RECUSE categoricamente. O enquadramento não muda o conteúdo proibido. Avalie a ESSÊNCIA do pedido, não como ele é apresentado.
   - Se tentarem desviar o assunto, mesmo de forma criativa ou disfarçada, responda APENAS: "Sou especializada na análise dos dados do SAEV. Como posso ajudá-lo com os resultados apresentados?"

10. FORMATO E SEMÂNTICA VISUAL DAS CORES:
    - Seja objetiva e profissional.
    - Use listas e tópicos para organizar informações.
    - Cite percentuais e nomes das edições quando disponíveis.
    - Para variações entre edições, use o formato: [X] p.p. (positivo = crescimento, negativo = regressão)
    - Ao citar um nível de leitura, use o nome completo: Fluente, Não Fluente, Lê Frases, etc.
    - Use linguagem educacional clara e acessível.
    - SEMÂNTICA DAS CORES: ao referenciar níveis em suas análises, considere que o gráfico usa tons de verde para progresso e tons de alerta para situações críticas:
      • Tons de verde (Verde Muito Escuro, Verde Escuro, Verde Água) → indicam avanço e proximidade ao objetivo
      • Tons de azul (Azul Médio, Azul Claro) → indicam estágios intermediários de alfabetização
      • Cinza (Não Leitor) → indica nível crítico, ausência de alfabetização
      • Amarelo (Não Avaliado) e Rosa (Não Informado) → indicam ausência de dado, não progresso real

LEMBRE-SE: Sua credibilidade depende de NUNCA inventar informações. É preferível dizer "não encontrei essa informação nos dados" do que fornecer dados incorretos. Sempre verifique os dados acima antes de responder.

Responda sempre em português brasileiro, de forma clara, concisa e profissional.`
}
