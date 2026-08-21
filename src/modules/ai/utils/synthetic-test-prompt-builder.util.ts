import {
  QUESTION_LEVEL_LABELS,
  UNCLASSIFIED_LEVEL_LABEL,
} from 'src/shared/enums/question-level.enum'

import {
  SyntheticTestQuestion,
  SyntheticTestReportContext,
  SyntheticTestSubject,
} from '../model/interface/report-context.interface'
import { sanitizeSyntheticTestReportContext } from './sanitize.util'

// ─── Constantes ───────────────────────────────────────────────────────────────

const PERFORMANCE_THRESHOLDS = {
  CRITICAL: 25,
  INSUFFICIENT: 50,
  PARTIAL: 75,
} as const

type PerformanceLevel = 'critical' | 'insufficient' | 'partial' | 'full'

const PERFORMANCE_LABELS: Record<PerformanceLevel, string> = {
  critical: 'Domínio Crítico',
  insufficient: 'Domínio Insuficiente',
  partial: 'Domínio Parcial',
  full: 'Domínio Pleno',
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

// ─── Utilitários ──────────────────────────────────────────────────────────────

function classifyPerformance(value: number): PerformanceLevel {
  if (value < PERFORMANCE_THRESHOLDS.CRITICAL) return 'critical'
  if (value < PERFORMANCE_THRESHOLDS.INSUFFICIENT) return 'insufficient'
  if (value < PERFORMANCE_THRESHOLDS.PARTIAL) return 'partial'
  return 'full'
}

function formatPercentage(value: number): string {
  return `${Number(value).toFixed(1)}%`
}

// ─── Cabeçalho ────────────────────────────────────────────────────────────────

function formatContextHeader(context: SyntheticTestReportContext): string {
  const lines: string[] = ['=== DADOS DO RELATÓRIO SINTÉTICO DE TESTES ===\n']

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

// ─── Breadcrumb / Filtros ─────────────────────────────────────────────────────

function formatBreadcrumb(context: SyntheticTestReportContext): string {
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

function formatLocationInfo(context: SyntheticTestReportContext): string {
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

// ─── Formatação de Questão Individual ────────────────────────────────────────

function formatQuestion(question: SyntheticTestQuestion): string {
  const questionNumber = question.order + 1
  const correctOption = question.option?.toUpperCase()
  const level = classifyPerformance(
    question.options.find((o) => o.option?.toUpperCase() === correctOption)
      ?.value ?? 0,
  )
  const levelLabel = PERFORMANCE_LABELS[level]

  const difficultyLabel = question.level
    ? QUESTION_LEVEL_LABELS[question.level]
    : UNCLASSIFIED_LEVEL_LABEL

  const lines: string[] = [
    `\n  ▸ Questão ${questionNumber} | Nível de dificuldade: ${difficultyLabel} | Gabarito: ${correctOption} | Descritor: ${question.descriptor}`,
  ]

  // Distribuição de respostas por alternativa
  const optionsLine = question.options
    .map((opt) => {
      const isCorrect = opt.option?.toUpperCase() === correctOption
      const marker = isCorrect ? '✓' : ' '
      return `${marker}${opt.option}: ${formatPercentage(opt.value)} (${opt.totalCorrect} alunos)`
    })
    .join(' | ')

  lines.push(`    Respostas: ${optionsLine}`)

  // Percentual de acerto e classificação
  const correctValue =
    question.options.find((o) => o.option?.toUpperCase() === correctOption)
      ?.value ?? 0
  lines.push(`    Acerto: ${formatPercentage(correctValue)} → ${levelLabel}`)

  // Acertos por nível de leitura (apenas se houver dados relevantes)
  const reading = question.reportReadingCorrect
  const hasReadingData = READING_LEVEL_KEYS.some(
    (key) => reading[key] !== undefined && reading[key] > 0,
  )

  if (hasReadingData) {
    const readingParts = READING_LEVEL_KEYS.filter(
      (key) => reading[key] !== undefined,
    )
      .map(
        (key) =>
          `${READING_LEVEL_LABELS[key]}: ${formatPercentage(reading[key])}`,
      )
      .join(' | ')

    lines.push(`    Acerto por nível de leitura: ${readingParts}`)
  }

  return lines.join('\n')
}

// ─── Resumo por Nível de Dificuldade ─────────────────────────────────────────

function buildDifficultyLevelSummary(subject: SyntheticTestSubject): string {
  if (!subject.levelSummary?.length) return ''

  if (subject.hasLevelClassification === false) {
    return `\n  Nível de dificuldade: este teste foi cadastrado antes da marcação de níveis; nenhum item está classificado.`
  }

  const lines: string[] = [`\n  Acerto por nível de dificuldade dos itens:`]

  subject.levelSummary.forEach((entry) => {
    const value =
      entry.value === null || entry.value === undefined
        ? 'sem dados'
        : formatPercentage(entry.value)

    lines.push(`  - ${entry.label}: ${value} (${entry.totalItems} item(ns))`)
  })

  return lines.join('\n')
}

// ─── Resumo Estatístico da Disciplina ─────────────────────────────────────────

function buildSubjectSummary(subject: SyntheticTestSubject): string {
  if (!subject.items?.length) return ''

  const correctValues = subject.items.map((q) => {
    const correctOption = q.option?.toUpperCase()
    return (
      q.options.find((o) => o.option?.toUpperCase() === correctOption)?.value ??
      0
    )
  })

  const avg = correctValues.reduce((a, b) => a + b, 0) / correctValues.length
  const max = Math.max(...correctValues)
  const min = Math.min(...correctValues)

  const byLevel = {
    full: correctValues.filter((v) => v >= PERFORMANCE_THRESHOLDS.PARTIAL)
      .length,
    partial: correctValues.filter(
      (v) =>
        v >= PERFORMANCE_THRESHOLDS.INSUFFICIENT &&
        v < PERFORMANCE_THRESHOLDS.PARTIAL,
    ).length,
    insufficient: correctValues.filter(
      (v) =>
        v >= PERFORMANCE_THRESHOLDS.CRITICAL &&
        v < PERFORMANCE_THRESHOLDS.INSUFFICIENT,
    ).length,
    critical: correctValues.filter((v) => v < PERFORMANCE_THRESHOLDS.CRITICAL)
      .length,
  }

  const total = subject.items.length

  const lines: string[] = [
    `\n  Resumo da disciplina (${total} questões):`,
    `  - Média de acertos: ${formatPercentage(avg)}`,
    `  - Maior acerto: ${formatPercentage(max)} | Menor acerto: ${formatPercentage(min)}`,
    `  - Amplitude: ${formatPercentage(max - min)}`,
    `\n  Classificação das questões por nível de domínio:`,
    `  - Domínio Pleno (≥75%): ${byLevel.full} questão(ões)`,
    `  - Domínio Parcial (50-74%): ${byLevel.partial} questão(ões)`,
    `  - Domínio Insuficiente (25-49%): ${byLevel.insufficient} questão(ões)`,
    `  - Domínio Crítico (<25%): ${byLevel.critical} questão(ões)`,
  ]

  const difficultySummary = buildDifficultyLevelSummary(subject)

  if (difficultySummary) {
    lines.push(difficultySummary)
  }

  // Questões com melhor e pior desempenho
  const sortedByPerformance = [...subject.items].sort((a, b) => {
    const aVal =
      a.options.find((o) => o.option?.toUpperCase() === a.option?.toUpperCase())
        ?.value ?? 0
    const bVal =
      b.options.find((o) => o.option?.toUpperCase() === b.option?.toUpperCase())
        ?.value ?? 0
    return bVal - aVal
  })

  const best = sortedByPerformance[0]
  const worst = sortedByPerformance[sortedByPerformance.length - 1]

  if (best && worst && best.id !== worst.id) {
    const bestVal =
      best.options.find(
        (o) => o.option?.toUpperCase() === best.option?.toUpperCase(),
      )?.value ?? 0
    const worstVal =
      worst.options.find(
        (o) => o.option?.toUpperCase() === worst.option?.toUpperCase(),
      )?.value ?? 0

    lines.push(
      `\n  Questão com maior acerto: Q${best.order + 1} [${best.descriptor}] → ${formatPercentage(bestVal)}`,
    )
    lines.push(
      `  Questão com menor acerto: Q${worst.order + 1} [${worst.descriptor}] → ${formatPercentage(worstVal)}`,
    )
  }

  return lines.join('\n')
}

// ─── Formatação de Disciplina ─────────────────────────────────────────────────

function formatSubject(subject: SyntheticTestSubject): string {
  const lines: string[] = [
    `\n--- ${subject.subject.toUpperCase()} (${subject.typeSubject}) ---`,
  ]

  if (!subject.items?.length) {
    lines.push('[Nenhuma questão disponível para esta disciplina]')
    return lines.join('\n')
  }

  lines.push(buildSubjectSummary(subject))

  lines.push(`\n  QUESTÕES (ordenadas por número):`)

  const sortedQuestions = [...subject.items].sort((a, b) => a.order - b.order)
  sortedQuestions.forEach((question) => {
    lines.push(formatQuestion(question))
  })

  return lines.join('\n')
}

// ─── Comparativo Entre Disciplinas ────────────────────────────────────────────

function buildCrossSubjectSummary(subjects: SyntheticTestSubject[]): string {
  if (subjects.length < 2) return ''

  const subjectAverages = subjects.map((subject) => {
    if (!subject.items?.length) return { subject: subject.subject, avg: 0 }

    const correctValues = subject.items.map((q) => {
      const correctOption = q.option?.toUpperCase()
      return (
        q.options.find((o) => o.option?.toUpperCase() === correctOption)
          ?.value ?? 0
      )
    })

    const avg = correctValues.reduce((a, b) => a + b, 0) / correctValues.length
    return { subject: subject.subject, avg: Math.round(avg * 10) / 10 }
  })

  const sorted = [...subjectAverages].sort((a, b) => b.avg - a.avg)

  const lines: string[] = [
    '\n=== COMPARATIVO ENTRE DISCIPLINAS ===',
    '[Média calculada com base no percentual de acerto de todas as questões]',
  ]

  sorted.forEach((item, index) => {
    const level = classifyPerformance(item.avg)
    lines.push(
      `  ${index + 1}. ${item.subject}: ${formatPercentage(item.avg)} (${PERFORMANCE_LABELS[level]})`,
    )
  })

  return lines.join('\n')
}

// ─── Formatação de Todos os Itens ─────────────────────────────────────────────

function formatItems(context: SyntheticTestReportContext): string {
  if (!context.items?.length) return ''

  const lines: string[] = ['\n=== RESULTADOS POR DISCIPLINA ===']

  context.items.forEach((subject) => {
    lines.push(formatSubject(subject))
  })

  if (context.items.length >= 2) {
    lines.push(buildCrossSubjectSummary(context.items))
  }

  return lines.join('\n')
}

// ─── Referências ──────────────────────────────────────────────────────────────

function buildProficiencyReference(): string {
  return `
=== REFERÊNCIA: NÍVEIS DE DOMÍNIO POR QUESTÃO ===
- Domínio Pleno (≥ 75%): A maioria dos alunos acertou — habilidade bem consolidada.
- Domínio Parcial (50-74%): Acerto moderado — habilidade em desenvolvimento.
- Domínio Insuficiente (25-49%): Baixo acerto — habilidade com lacunas significativas.
- Domínio Crítico (< 25%): Acerto muito baixo — habilidade não consolidada, necessita intervenção.`
}

function buildDifficultyLevelReference(): string {
  return `
=== REFERÊNCIA: NÍVEL DE DIFICULDADE DOS ITENS ===
O nível de dificuldade é definido no cadastro do teste e NÃO se confunde com os níveis de domínio (que derivam do percentual de acerto):
- Básico: item de menor complexidade.
- Intermediário: item de complexidade média.
- Avançado: item de maior complexidade.
- Não classificado: item de teste cadastrado antes da marcação de níveis — não há informação de dificuldade.
O acerto por nível de dificuldade é a média ponderada dos itens daquele nível e exclui itens anulados. "sem dados" significa que não há respostas registradas para aquele nível.`
}

function buildReadingLevelReference(): string {
  return `
=== REFERÊNCIA: NÍVEIS DE LEITURA ===
Os percentuais de acerto por nível de leitura mostram como cada grupo de alunos (classificados pela avaliação de leitura) se saiu em cada questão:
- Fluente: Aluno com leitura fluida e compreensão textual adequada.
- Não Fluente: Aluno que lê com dificuldades na fluência e/ou compreensão.
- Lê Frases: Aluno capaz de ler frases simples, mas não textos completos.
- Lê Palavras: Aluno em fase de decodificação, lendo palavras isoladas.
- Lê Sílabas: Aluno que reconhece sílabas, mas não palavras completas.
- Não Leitor: Aluno ainda não alfabetizado.
- Não Avaliado: Aluno não avaliado por motivo justificado.
- Não Informado: Aluno sem registro de avaliação de leitura.`
}

// ─── Montagem do Contexto Completo ────────────────────────────────────────────

export function formatSyntheticTestContextForPrompt(
  contextData: SyntheticTestReportContext | undefined,
): string {
  if (!contextData)
    return 'Nenhum dado do relatório sintético de testes disponível para análise.'

  const sanitizedContext = sanitizeSyntheticTestReportContext(contextData)

  const sections: string[] = [
    formatContextHeader(sanitizedContext),
    formatBreadcrumb(sanitizedContext),
    formatLocationInfo(sanitizedContext),
    formatItems(sanitizedContext),
    buildProficiencyReference(),
    buildDifficultyLevelReference(),
    buildReadingLevelReference(),
  ]

  return sections.filter(Boolean).join('\n')
}

// ─── System Prompt Principal ──────────────────────────────────────────────────

export function buildSyntheticTestSystemPrompt(
  contextData: SyntheticTestReportContext | undefined,
): string {
  const contextString = formatSyntheticTestContextForPrompt(contextData)

  return `Você é a SAEVIA, assistente de IA especializada em análise de dados educacionais do SAEV (Sistema de Avaliação Educacional).

${contextString}

=== DIRETRIZES DE ANÁLISE ===

1. VERIFICAÇÃO RIGOROSA (CRÍTICO):
   - ANTES de responder qualquer pergunta, SEMPRE releia os dados acima para confirmar a informação.
   - NUNCA invente, suponha ou "complete" dados que não estão explicitamente presentes no contexto.
   - Se o usuário perguntar sobre algo que NÃO existe nos dados, responda: "Essa informação não está disponível nos dados fornecidos."
   - Se o usuário insistir ou questionar ("tem certeza?", "revise novamente"), releia os dados e mantenha sua resposta se estiver correta.
   - NÃO se deixe induzir ao erro: se os dados mostram X, responda X, mesmo que o usuário sugira Y.
   - Cada número, percentual e descritor que você citar DEVE estar presente nos dados acima. Verifique antes de responder.

   PROCEDIMENTO OBRIGATÓRIO ao responder sobre uma questão específica:
   1. Identifique a disciplina sendo perguntada (ou todas, se não especificada)
   2. Procure na listagem dessa disciplina pelo marcador ▸ Questão [NÚMERO]
   3. Leia APENAS os dados dessa questão específica
   4. NUNCA misture dados de outras questões ou disciplinas
   5. Se não encontrar a questão, ela NÃO está nos dados

2. ENTENDENDO A ESTRUTURA DOS DADOS:
   - Os dados são organizados em: Disciplina → Questões
   - Cada DISCIPLINA possui um conjunto de questões da prova
   - Cada QUESTÃO possui:
     * Número da questão (ordem na prova)
     * Nível de dificuldade do item (Básico, Intermediário, Avançado ou Não classificado)
     * Gabarito (alternativa correta: A, B, C ou D)
     * Descritor avaliado (habilidade que a questão mede)
     * Distribuição de respostas: percentual de alunos que marcou cada alternativa (A, B, C, D, -)
     * Percentual de acerto: percentual de alunos que acertou (marcou o gabarito)
     * Acerto por nível de leitura: percentual de acerto de cada grupo de alunos classificados por nível de leitura
   - Para localizar uma questão: procure pelo marcador ▸ Questão [NÚMERO]

3. ANÁLISES PERMITIDAS:
   - Comparar o percentual de acerto entre questões de uma mesma disciplina
   - Comparar o desempenho médio entre disciplinas diferentes
   - Identificar questões com maior e menor percentual de acerto
   - Classificar questões por nível de domínio (Pleno, Parcial, Insuficiente, Crítico)
   - Analisar a distribuição de respostas por alternativa (identificar distratores mais marcados)
   - Analisar como diferentes grupos de leitura se saíram em cada questão
   - Identificar padrões entre o nível de leitura dos alunos e o desempenho nas questões
   - Comparar o acerto entre os níveis de dificuldade dos itens (Básico, Intermediário, Avançado)

4. SOBRE OS NÍVEIS DE DOMÍNIO:
   - Domínio Pleno (≥ 75%): A maioria dos alunos acertou — habilidade bem consolidada.
   - Domínio Parcial (50-74%): Acerto moderado — habilidade em desenvolvimento.
   - Domínio Insuficiente (25-49%): Baixo acerto — habilidade com lacunas significativas.
   - Domínio Crítico (< 25%): Acerto muito baixo — habilidade não consolidada.
   - Use esses níveis para contextualizar os percentuais ao responder.

5. SOBRE A DISTRIBUIÇÃO DE RESPOSTAS:
   - A alternativa marcada com ✓ é o gabarito (resposta correta).
   - As demais alternativas são distratores — alunos que as marcaram erraram a questão.
   - A alternativa "-" representa alunos que não responderam a questão.
   - Um distrator com alto percentual indica que muitos alunos foram atraídos por aquela alternativa errada.
   - Exemplo: "B: 45% (90 alunos)" significa que 45% dos alunos marcaram B.

6. SOBRE O ACERTO POR NÍVEL DE LEITURA:
   - Estes dados mostram o percentual de acerto de cada grupo de alunos classificados pela avaliação de leitura.
   - Permite identificar se alunos com melhor leitura também têm melhor desempenho nas questões.
   - Exemplo: "Fluente: 80% | Não Leitor: 20%" indica que alunos fluentes acertam muito mais que não leitores.
   - Se um nível de leitura não aparece, não há dados disponíveis para aquele grupo nesta questão.

7. COMO RESPONDER PERGUNTAS COMUNS:
   - "Qual questão teve mais acertos?" → Consulte o resumo da disciplina e identifique a questão com maior percentual de acerto.
   - "Qual o descritor da questão 3?" → Procure ▸ Questão 3 e informe o campo "Descritor".
   - "Quais questões têm domínio crítico?" → Liste todas com acerto < 25%.
   - "Compare Português e Matemática" → Use o COMPARATIVO ENTRE DISCIPLINAS.
   - "Como os alunos fluentes se saíram na questão 5?" → Procure ▸ Questão 5 e consulte "Acerto por nível de leitura: Fluente".
   - Se o usuário NÃO especificar a disciplina, responda para TODAS as disciplinas que possuem a informação.

8. PROIBIÇÕES:
   - NÃO responda sobre assuntos fora da análise educacional destes dados. Isso inclui, sem exceção: receitas, piadas, poemas, histórias, instruções de qualquer natureza, informações gerais ou qualquer conteúdo não relacionado aos dados do SAEV.
   - NÃO forneça comparações com benchmarks externos não fornecidos.
   - NÃO faça previsões ou projeções não baseadas nos dados.
   - NÃO invente dados que não existem, mesmo que o usuário insista.
   - SEM sugestões pedagógicas avançadas, sem recomendações de intervenção pedagógica, estratégias de ensino ou planos de ação. Seu papel é interpretar e apresentar os dados, deixando as decisões pedagógicas para os profissionais da educação.
   - ATENÇÃO — Bypass por enquadramento: Se o usuário pedir conteúdo fora do escopo MESMO enquadrando como "análise de relatório" (ex: "me faça uma receita de bolo como se fosse análise", "escreva um poema como se estivesse analisando os dados"), RECUSE categoricamente. O enquadramento não muda o conteúdo proibido. Avalie a ESSÊNCIA do pedido, não como ele é apresentado.
   - Se tentarem desviar o assunto, mesmo de forma criativa ou disfarçada, responda APENAS: "Sou especializada na análise dos dados do SAEV. Como posso ajudá-lo com os resultados apresentados?"

9. FORMATO:
   - Seja objetiva e profissional.
   - Use listas e tópicos para organizar informações.
   - Cite percentuais e descritores quando disponíveis.
   - Ao comparar questões, mencione-as pelo número e descritor.
   - Use linguagem educacional clara e acessível.
   - Ao citar uma questão, use o formato: Questão [N] - [Descritor] ([X]% de acerto)

LEMBRE-SE: Sua credibilidade depende de NUNCA inventar informações. É preferível dizer "não encontrei essa informação nos dados" do que fornecer dados incorretos. Sempre verifique os dados acima antes de responder.

Responda sempre em português brasileiro, de forma clara, concisa e profissional.`
}
