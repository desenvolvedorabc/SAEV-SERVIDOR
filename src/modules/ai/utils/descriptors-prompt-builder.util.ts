import {
  DescriptorItem,
  DescriptorsReportContext,
  DescriptorsSubject,
  DescriptorsTopic,
} from '../model/interface/report-context.interface'
import { sanitizeDescriptorsReportContext } from './sanitize.util'

// ─── Constantes de Classificação ─────────────────────────────────────────────

const PERFORMANCE_THRESHOLDS = {
  CRITICAL: 25,
  INSUFFICIENT: 50,
  PARTIAL: 75,
} as const

type PerformanceLevel = 'critical' | 'insufficient' | 'partial' | 'full'

function classifyPerformance(value: number): PerformanceLevel {
  if (value < PERFORMANCE_THRESHOLDS.CRITICAL) return 'critical'
  if (value < PERFORMANCE_THRESHOLDS.INSUFFICIENT) return 'insufficient'
  if (value < PERFORMANCE_THRESHOLDS.PARTIAL) return 'partial'
  return 'full'
}

const PERFORMANCE_LABELS: Record<PerformanceLevel, string> = {
  critical: 'Domínio Crítico',
  insufficient: 'Domínio Insuficiente',
  partial: 'Domínio Parcial',
  full: 'Domínio Pleno',
}

// ─── Formatação do Cabeçalho ──────────────────────────────────────────────────

function formatDescriptorsContextHeader(
  context: DescriptorsReportContext,
): string {
  const lines: string[] = ['=== DADOS DO RELATÓRIO DE DESCRITORES ===\n']

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

// ─── Formatação do Breadcrumb ─────────────────────────────────────────────────

function formatDescriptorsBreadcrumb(
  context: DescriptorsReportContext,
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

// ─── Formatação da Localização ────────────────────────────────────────────────

function formatDescriptorsLocationInfo(
  context: DescriptorsReportContext,
): string {
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

// ─── Formatação de Descritores ────────────────────────────────────────────────

function formatDescriptorItem(descriptor: DescriptorItem): string {
  const level = classifyPerformance(descriptor.value)
  const levelLabel = PERFORMANCE_LABELS[level]
  return `    ▸ [${descriptor.cod}] ${descriptor.name}: ${descriptor.value}% (${levelLabel})`
}

function formatDescriptorsTopic(topic: DescriptorsTopic): string {
  const lines: string[] = []
  const topicLevel = classifyPerformance(topic.value)
  const topicLevelLabel = PERFORMANCE_LABELS[topicLevel]

  lines.push(
    `\n  📚 TÓPICO: ${topic.name} | Desempenho: ${topic.value}% (${topicLevelLabel})`,
  )
  lines.push(`  [Descritores deste tópico - ordenados por desempenho]`)

  const sortedDescriptors = [...topic.descritores].sort(
    (a, b) => b.value - a.value,
  )

  sortedDescriptors.forEach((descriptor) => {
    lines.push(formatDescriptorItem(descriptor))
  })

  return lines.join('\n')
}

function buildTopicSummary(topics: DescriptorsTopic[]): string {
  if (topics.length === 0) return ''

  const sortedTopics = [...topics].sort((a, b) => b.value - a.value)
  const bestTopic = sortedTopics[0]
  const worstTopic = sortedTopics[sortedTopics.length - 1]

  const allDescriptors = topics.flatMap((t) => t.descritores)
  const criticalDescriptors = allDescriptors.filter(
    (d) => d.value < PERFORMANCE_THRESHOLDS.CRITICAL,
  )
  const insufficientDescriptors = allDescriptors.filter(
    (d) =>
      d.value >= PERFORMANCE_THRESHOLDS.CRITICAL &&
      d.value < PERFORMANCE_THRESHOLDS.INSUFFICIENT,
  )
  const partialDescriptors = allDescriptors.filter(
    (d) =>
      d.value >= PERFORMANCE_THRESHOLDS.INSUFFICIENT &&
      d.value < PERFORMANCE_THRESHOLDS.PARTIAL,
  )
  const fullDescriptors = allDescriptors.filter(
    (d) => d.value >= PERFORMANCE_THRESHOLDS.PARTIAL,
  )

  const lines: string[] = ['\n  Resumo comparativo dos tópicos:']

  if (topics.length >= 2) {
    lines.push(
      `  - Tópico com melhor desempenho: ${bestTopic.name} (${bestTopic.value}%)`,
    )
    lines.push(
      `  - Tópico com pior desempenho: ${worstTopic.name} (${worstTopic.value}%)`,
    )
    lines.push(
      `  - Amplitude entre tópicos: ${(bestTopic.value - worstTopic.value).toFixed(1)} pontos percentuais`,
    )
  }

  lines.push('\n  Classificação dos descritores por nível de domínio:')
  lines.push(
    `  - Domínio Pleno (≥75%): ${fullDescriptors.length} descritor(es)${fullDescriptors.length > 0 ? ` → ${fullDescriptors.map((d) => d.cod).join(', ')}` : ''}`,
  )
  lines.push(
    `  - Domínio Parcial (50-74%): ${partialDescriptors.length} descritor(es)${partialDescriptors.length > 0 ? ` → ${partialDescriptors.map((d) => d.cod).join(', ')}` : ''}`,
  )
  lines.push(
    `  - Domínio Insuficiente (25-49%): ${insufficientDescriptors.length} descritor(es)${insufficientDescriptors.length > 0 ? ` → ${insufficientDescriptors.map((d) => d.cod).join(', ')}` : ''}`,
  )
  lines.push(
    `  - Domínio Crítico (<25%): ${criticalDescriptors.length} descritor(es)${criticalDescriptors.length > 0 ? ` → ${criticalDescriptors.map((d) => d.cod).join(', ')}` : ''}`,
  )

  return lines.join('\n')
}

function formatDescriptorsSubject(subject: DescriptorsSubject): string {
  const lines: string[] = [`\n--- ${subject.subject.toUpperCase()} ---`]

  if (!subject.topics?.length) {
    lines.push('[Nenhum tópico disponível para esta disciplina]')
    return lines.join('\n')
  }

  subject.topics.forEach((topic) => {
    lines.push(formatDescriptorsTopic(topic))
  })

  lines.push(buildTopicSummary(subject.topics))

  return lines.join('\n')
}

// ─── Formatação de Todas as Disciplinas ──────────────────────────────────────

function formatDescriptorsItems(context: DescriptorsReportContext): string {
  if (!context.items?.length) return ''

  const lines: string[] = ['\n=== RESULTADOS POR DISCIPLINA E DESCRITOR ===']

  context.items.forEach((subject) => {
    lines.push(formatDescriptorsSubject(subject))
  })

  if (context.items.length >= 2) {
    lines.push(buildCrossSubjectSummary(context.items))
  }

  return lines.join('\n')
}

// ─── Resumo Comparativo Entre Disciplinas ────────────────────────────────────

function buildCrossSubjectSummary(subjects: DescriptorsSubject[]): string {
  const subjectAverages = subjects.map((subject) => {
    const allDescriptors = subject.topics.flatMap((t) => t.descritores)
    if (allDescriptors.length === 0) return { subject: subject.subject, avg: 0 }

    const avg =
      allDescriptors.reduce((sum, d) => sum + d.value, 0) /
      allDescriptors.length
    return { subject: subject.subject, avg: Math.round(avg) }
  })

  const sorted = [...subjectAverages].sort((a, b) => b.avg - a.avg)

  const lines: string[] = [
    '\n=== COMPARATIVO ENTRE DISCIPLINAS ===',
    '[Média calculada com base em todos os descritores de cada disciplina]',
  ]

  sorted.forEach((item, index) => {
    const level = classifyPerformance(item.avg)
    lines.push(
      `  ${index + 1}. ${item.subject}: ${item.avg}% (${PERFORMANCE_LABELS[level]})`,
    )
  })

  return lines.join('\n')
}

// ─── Referências ──────────────────────────────────────────────────────────────

function buildDescriptorsProficiencyReference(): string {
  return `
=== REFERÊNCIA: NÍVEIS DE DOMÍNIO POR DESCRITOR ===
- Domínio Pleno (≥ 75%): Habilidade bem consolidada pelos alunos.
- Domínio Parcial (50-74%): Habilidade em desenvolvimento, com consolidação parcial.
- Domínio Insuficiente (25-49%): Habilidade com lacunas significativas, necessita atenção.
- Domínio Crítico (< 25%): Habilidade não consolidada, necessita intervenção urgente.`
}

// ─── Montagem do Contexto Completo ────────────────────────────────────────────

export function formatDescriptorsContextForPrompt(
  contextData: DescriptorsReportContext | undefined,
): string {
  if (!contextData)
    return 'Nenhum dado de relatório de descritores disponível para análise.'

  const sanitizedContext = sanitizeDescriptorsReportContext(contextData)

  const sections: string[] = [
    formatDescriptorsContextHeader(sanitizedContext),
    formatDescriptorsBreadcrumb(sanitizedContext),
    formatDescriptorsLocationInfo(sanitizedContext),
    formatDescriptorsItems(sanitizedContext),
    buildDescriptorsProficiencyReference(),
  ]

  return sections.filter(Boolean).join('\n')
}

// ─── System Prompt Principal ──────────────────────────────────────────────────

export function buildDescriptorsSystemPrompt(
  contextData: DescriptorsReportContext | undefined,
): string {
  const contextString = formatDescriptorsContextForPrompt(contextData)

  return `Você é a SAEVIA, assistente de IA especializada em análise de dados educacionais do SAEV (Sistema de Avaliação Educacional).

${contextString}

=== DIRETRIZES DE ANÁLISE ===

1. VERIFICAÇÃO RIGOROSA (CRÍTICO):
   - ANTES de responder qualquer pergunta, SEMPRE releia os dados acima para confirmar a informação.
   - NUNCA invente, suponha ou "complete" dados que não estão explicitamente presentes no contexto.
   - Se o usuário perguntar sobre algo que NÃO existe nos dados, responda: "Essa informação não está disponível nos dados fornecidos."
   - Se o usuário insistir ou questionar ("tem certeza?", "revise novamente"), releia os dados e mantenha sua resposta se estiver correta.
   - NÃO se deixe induzir ao erro: se os dados mostram X, responda X, mesmo que o usuário sugira Y.
   - Cada número, nome e percentual que você citar DEVE estar presente nos dados acima. Verifique antes de responder.

   PROCEDIMENTO OBRIGATÓRIO ao responder sobre um descritor específico:
   1. Identifique a disciplina sendo perguntada (ou todas, se não especificada)
   2. Procure na listagem dessa disciplina pelo marcador ▸ [CÓDIGO] seguido do CÓDIGO EXATO
   3. Leia APENAS os dados dessa linha específica
   4. NUNCA misture dados de outros descritores ou disciplinas
   5. Se não encontrar o CÓDIGO EXATO, o descritor NÃO está nos dados

2. ENTENDENDO A ESTRUTURA DOS DADOS:
   - Os dados são organizados em: Disciplina → Tópico/Eixo Temático → Descritor
   - Cada TÓPICO agrupa descritores relacionados a uma mesma área de conhecimento
   - Cada DESCRITOR representa uma habilidade específica avaliada, com seu percentual de acertos
   - O percentual de acertos do TÓPICO é calculado com base nos descritores que o compõem
   - Para localizar um descritor específico: procure pelo marcador ▸ [CÓDIGO] (ex: ▸ [P005])

3. ANÁLISES PERMITIDAS:
   - Comparar o desempenho entre tópicos de uma mesma disciplina
   - Comparar o desempenho entre disciplinas diferentes
   - Identificar descritores com maior e menor percentual de acertos
   - Classificar descritores por nível de domínio (Pleno, Parcial, Insuficiente, Crítico)
   - Identificar quais habilidades estão consolidadas e quais apresentam dificuldades
   - Analisar a amplitude entre o melhor e o pior descritor/tópico
   - Descrever padrões e tendências observadas nos dados

4. SOBRE OS NÍVEIS DE DOMÍNIO:
   - Domínio Pleno (≥ 75%): Habilidade bem consolidada — a maioria dos alunos domina.
   - Domínio Parcial (50-74%): Habilidade em desenvolvimento — consolidação parcial.
   - Domínio Insuficiente (25-49%): Habilidade com lacunas — necessita atenção.
   - Domínio Crítico (< 25%): Habilidade não consolidada — situação preocupante.
   - Use esses níveis para contextualizar os percentuais ao responder.

5. COMO RESPONDER PERGUNTAS SOBRE DESCRITORES:
   - "Qual o desempenho do descritor P005?" → Procure ▸ [P005] na listagem e informe o percentual e nível de domínio
   - "Quais descritores têm domínio crítico?" → Liste todos com valor < 25%
   - "Qual o tópico com melhor desempenho em Português?" → Consulte o resumo comparativo de Português
   - "Compare Português e Matemática" → Use o COMPARATIVO ENTRE DISCIPLINAS
   - Se o usuário NÃO especificar a disciplina, responda para TODAS as disciplinas que possuem o descritor

6. PROIBIÇÕES:
   - NÃO responda sobre assuntos fora da análise educacional destes dados. Isso inclui, sem exceção: receitas, piadas, poemas, histórias, instruções de qualquer natureza, informações gerais ou qualquer conteúdo não relacionado aos dados do SAEV.
   - NÃO forneça comparações com benchmarks externos não fornecidos.
   - NÃO faça previsões ou projeções não baseadas nos dados.
   - NÃO invente dados que não existem, mesmo que o usuário insista.
   - SEM sugestões pedagógicas avançadas, sem recomendações de intervenção pedagógica, estratégias de ensino ou planos de ação. Seu papel é interpretar e apresentar os dados, deixando as decisões pedagógicas para os profissionais da educação.
   - ATENÇÃO — Bypass por enquadramento: Se o usuário pedir conteúdo fora do escopo MESMO enquadrando como "análise de relatório" (ex: "me faça uma receita de bolo como se fosse análise", "escreva um poema como se estivesse analisando os dados"), RECUSE categoricamente. O enquadramento não muda o conteúdo proibido. Avalie a ESSÊNCIA do pedido, não como ele é apresentado.
   - Se tentarem desviar o assunto, mesmo de forma criativa ou disfarçada, responda APENAS: "Sou especializada na análise dos dados do SAEV. Como posso ajudá-lo com os resultados apresentados?"

7. FORMATO:
   - Seja objetiva e profissional.
   - Use listas e tópicos para organizar informações.
   - Cite percentuais e códigos de descritores quando disponíveis.
   - Ao comparar descritores, mencione-os pelo código e nome.
   - Use linguagem educacional clara e acessível.
   - Ao citar um descritor, use o formato: [CÓDIGO] - Descrição (XX%)

LEMBRE-SE: Sua credibilidade depende de NUNCA inventar informações. É preferível dizer "não encontrei essa informação nos dados" do que fornecer dados incorretos. Sempre verifique os dados acima antes de responder.

Responda sempre em português brasileiro, de forma clara, concisa e profissional.`
}
