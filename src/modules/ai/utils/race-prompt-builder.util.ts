import {
  RaceData,
  RaceEditionItem,
  RaceReportContext,
  RaceSubject,
} from '../model/interface/report-context.interface'
import { sanitizeRaceReportContext } from './sanitize.util'

// ─── Constantes ───────────────────────────────────────────────────────────────

const PERFORMANCE_THRESHOLDS = {
  CRITICAL: 25,
  INSUFFICIENT: 50,
  PARTIAL: 75,
} as const

type PerformanceLevel = 'critical' | 'insufficient' | 'partial' | 'full'

const PERFORMANCE_LABELS: Record<PerformanceLevel, string> = {
  critical: 'Desempenho Crítico',
  insufficient: 'Desempenho Insuficiente',
  partial: 'Desempenho Parcial',
  full: 'Desempenho Pleno',
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

function formatDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : ''
  return `${sign}${delta.toFixed(1)} p.p.`
}

// ─── Cabeçalho ────────────────────────────────────────────────────────────────

function formatContextHeader(context: RaceReportContext): string {
  const lines: string[] = ['=== DADOS DO RELATÓRIO DE COR E RAÇA ===\n']

  if (context.serie?.SER_NOME) {
    lines.push(`SÉRIE: ${context.serie.SER_NOME}`)
  }

  if (context.year?.name) {
    lines.push(`ANO LETIVO: ${context.year.name}`)
  }

  return lines.join('\n')
}

// ─── Breadcrumb / Filtros ─────────────────────────────────────────────────────

function formatBreadcrumb(context: RaceReportContext): string {
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

function formatLocationInfo(context: RaceReportContext): string {
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

// ─── Resumo Macro do Relatório ────────────────────────────────────────────────

function buildMacroSummary(context: RaceReportContext): string {
  if (!context.items?.length) return ''

  // Agrega alunos por grupo racial (para contagem geral)
  const raceStudentTotals: Record<
    string,
    { totalStudents: number; name: string }
  > = {}
  let grandTotalStudents = 0

  context.items.forEach((subject) => {
    subject.items.forEach((edition) => {
      edition.races.forEach((race) => {
        if (!raceStudentTotals[race.name]) {
          raceStudentTotals[race.name] = { totalStudents: 0, name: race.name }
        }
        raceStudentTotals[race.name].totalStudents += race.countTotalStudents
        grandTotalStudents += race.countTotalStudents
      })
    })
  })

  const dominantRace = Object.values(raceStudentTotals).sort(
    (a, b) => b.totalStudents - a.totalStudents,
  )[0]

  const lines: string[] = [
    '\n=== RESUMO MACRO DO RELATÓRIO ===',
    `Total de alunos processados: ${grandTotalStudents}`,
    `Grupo racial predominante: ${dominantRace?.name ?? '-'} (${dominantRace?.totalStudents ?? 0} alunos)`,
  ]

  // Média geral POR DISCIPLINA (não mistura disciplinas diferentes)
  lines.push(
    '\nMédia geral de desempenho POR DISCIPLINA (todos os grupos/edições):',
  )
  context.items.forEach((subject) => {
    const percents: number[] = []
    subject.items.forEach((edition) => {
      edition.races.forEach((race) => {
        if (race.countTotalStudents > 0) {
          percents.push(race.total_percent)
        }
      })
    })
    if (percents.length > 0) {
      const avg = percents.reduce((a, b) => a + b, 0) / percents.length
      lines.push(
        `  - ${subject.subject} (${subject.typeSubject}): ${formatPercentage(avg)}`,
      )
    }
  })

  // Lista todos os grupos com total de alunos e desempenho POR DISCIPLINA
  const sortedRaces = Object.values(raceStudentTotals).sort(
    (a, b) => b.totalStudents - a.totalStudents,
  )
  lines.push('\nDistribuição de alunos por grupo racial:')
  sortedRaces.forEach((race) => {
    const pct =
      grandTotalStudents > 0
        ? ((race.totalStudents / grandTotalStudents) * 100).toFixed(1)
        : '0.0'

    // Calcula desempenho médio por disciplina para cada grupo racial
    const subjectAvgs: string[] = []
    context.items.forEach((subject) => {
      const percents: number[] = []
      subject.items.forEach((edition) => {
        const raceData = edition.races.find(
          (r) => r.name === race.name && r.countTotalStudents > 0,
        )
        if (raceData) {
          percents.push(raceData.total_percent)
        }
      })
      if (percents.length > 0) {
        const avg = percents.reduce((a, b) => a + b, 0) / percents.length
        subjectAvgs.push(`${subject.subject}: ${formatPercentage(avg)}`)
      }
    })

    lines.push(
      `  - ${race.name}: ${race.totalStudents} alunos (${pct}% do total)`,
    )
    if (subjectAvgs.length > 0) {
      lines.push(
        `    Desempenho médio por disciplina: ${subjectAvgs.join(' | ')}`,
      )
    }
  })

  return lines.join('\n')
}

// ─── Destaques e Pontos de Atenção ────────────────────────────────────────────

function buildHighlightsAndAlerts(context: RaceReportContext): string {
  if (!context.items?.length) return ''

  const highlights: string[] = []
  const alerts: string[] = []

  context.items.forEach((subject) => {
    // Calcula média geral da disciplina em todas as edições
    const allPercents = subject.items.flatMap((edition) =>
      edition.races
        .filter((r) => r.countTotalStudents > 0)
        .map((r) => r.total_percent),
    )
    const subjectAvg =
      allPercents.length > 0
        ? allPercents.reduce((a, b) => a + b, 0) / allPercents.length
        : 0

    subject.items.forEach((edition) => {
      const racesWithData = edition.races.filter(
        (r) => r.countTotalStudents > 0,
      )
      if (racesWithData.length === 0) return

      const editionPercents = racesWithData.map((r) => r.total_percent)
      const editionAvg =
        editionPercents.reduce((a, b) => a + b, 0) / editionPercents.length
      const maxPct = Math.max(...editionPercents)
      const minPct = Math.min(...editionPercents)
      const amplitude = maxPct - minPct

      const bestRace = racesWithData.find((r) => r.total_percent === maxPct)
      const worstRace = racesWithData.find((r) => r.total_percent === minPct)

      // Destaque: melhor grupo
      if (
        bestRace &&
        bestRace.total_percent >= PERFORMANCE_THRESHOLDS.PARTIAL
      ) {
        highlights.push(
          `✅ ${subject.subject} | ${edition.name}: Grupo "${bestRace.name}" com ${formatPercentage(bestRace.total_percent)} (${bestRace.countTotalStudents} alunos)`,
        )
      }

      // Alerta: disparidade crítica (grupo 20+ p.p. abaixo da média)
      racesWithData.forEach((race) => {
        const diff = editionAvg - race.total_percent
        if (diff >= 20) {
          alerts.push(
            `⚠️ DISPARIDADE CRÍTICA — ${subject.subject} | ${edition.name}: Grupo "${race.name}" está ${formatDelta(-diff)} abaixo da média do grupo (${formatPercentage(editionAvg)})`,
          )
        }
      })

      // Alerta: amplitude crítica entre grupos
      if (amplitude >= 30) {
        alerts.push(
          `⚠️ AMPLITUDE ELEVADA — ${subject.subject} | ${edition.name}: Diferença de ${formatPercentage(amplitude)} entre "${bestRace?.name}" (${formatPercentage(maxPct)}) e "${worstRace?.name}" (${formatPercentage(minPct)})`,
        )
      }

      // Alerta: grupos com desempenho crítico
      racesWithData.forEach((race) => {
        if (race.total_percent < PERFORMANCE_THRESHOLDS.CRITICAL) {
          alerts.push(
            `🔴 DESEMPENHO CRÍTICO — ${subject.subject} | ${edition.name}: Grupo "${race.name}" com apenas ${formatPercentage(race.total_percent)} (${race.countTotalStudents} alunos)`,
          )
        }
      })

      // Alerta: alto índice de Não Leitor (apenas leitura)
      if (subject.typeSubject !== 'Objetiva') {
        racesWithData.forEach((race) => {
          if (race.countTotalStudents > 0) {
            const naoLeitorPct =
              (race.nao_leitor / race.countTotalStudents) * 100
            if (naoLeitorPct >= 30) {
              alerts.push(
                `📚 ALTO ÍNDICE NÃO LEITOR — ${subject.subject} | ${edition.name}: Grupo "${race.name}" com ${naoLeitorPct.toFixed(1)}% de Não Leitores (${race.nao_leitor} alunos)`,
              )
            }
          }
        })
      }

      // Alerta: grupos com poucos alunos (relevância estatística)
      racesWithData.forEach((race) => {
        if (race.countTotalStudents > 0 && race.countTotalStudents <= 5) {
          alerts.push(
            `ℹ️ BAIXA REPRESENTATIVIDADE — ${subject.subject} | ${edition.name}: Grupo "${race.name}" possui apenas ${race.countTotalStudents} aluno(s) — dados podem não ser estatisticamente representativos`,
          )
        }
      })

      // Alerta: desempenho abaixo da média geral da disciplina
      if (subjectAvg > 0) {
        racesWithData.forEach((race) => {
          const diff = subjectAvg - race.total_percent
          if (diff >= 15 && race.countTotalStudents > 5) {
            alerts.push(
              `📉 ABAIXO DA MÉDIA — ${subject.subject} | ${edition.name}: Grupo "${race.name}" (${formatPercentage(race.total_percent)}) está ${formatDelta(-diff)} abaixo da média geral da disciplina (${formatPercentage(subjectAvg)})`,
            )
          }
        })
      }
    })

    // Destaques: evolução positiva entre edições
    if (subject.items.length >= 2) {
      const sortedEditions = [...subject.items].sort((a, b) => a.id - b.id)
      const firstEdition = sortedEditions[0]
      const lastEdition = sortedEditions[sortedEditions.length - 1]

      firstEdition.races.forEach((firstRace) => {
        const lastRace = lastEdition.races.find(
          (r) => r.name === firstRace.name,
        )
        if (
          lastRace &&
          firstRace.countTotalStudents > 0 &&
          lastRace.countTotalStudents > 0
        ) {
          const delta = lastRace.total_percent - firstRace.total_percent
          if (delta >= 10) {
            highlights.push(
              `📈 MAIOR EVOLUÇÃO — ${subject.subject}: Grupo "${firstRace.name}" evoluiu ${formatDelta(delta)} entre "${firstEdition.name}" e "${lastEdition.name}"`,
            )
          }
          if (delta <= -10) {
            alerts.push(
              `📉 QUEDA SIGNIFICATIVA — ${subject.subject}: Grupo "${firstRace.name}" caiu ${formatDelta(delta)} entre "${firstEdition.name}" e "${lastEdition.name}"`,
            )
          }
        }
      })
    }
  })

  const lines: string[] = []

  if (highlights.length > 0) {
    lines.push('\n=== DESTAQUES POSITIVOS ===')
    highlights.forEach((h) => lines.push(`  ${h}`))
  }

  if (alerts.length > 0) {
    lines.push('\n=== PONTOS DE ATENÇÃO ===')
    alerts.forEach((a) => lines.push(`  ${a}`))
  }

  return lines.join('\n')
}

// ─── Comparativo das Duas Maiores Raças ───────────────────────────────────────

function buildTop2RacesComparison(context: RaceReportContext): string {
  if (!context.items?.length) return ''

  // Identifica as duas raças com maior número de alunos (agregado)
  const raceTotals: Record<string, number> = {}
  context.items.forEach((subject) => {
    subject.items.forEach((edition) => {
      edition.races.forEach((race) => {
        raceTotals[race.name] =
          (raceTotals[race.name] ?? 0) + race.countTotalStudents
      })
    })
  })

  const top2 = Object.entries(raceTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([name]) => name)

  if (top2.length < 2) return ''

  const [race1Name, race2Name] = top2

  const lines: string[] = [
    `\n=== COMPARATIVO: "${race1Name}" vs "${race2Name}" (grupos com maior representatividade) ===`,
  ]

  context.items.forEach((subject) => {
    lines.push(`\n  ${subject.subject} (${subject.typeSubject}):`)

    subject.items.forEach((edition) => {
      const r1 = edition.races.find((r) => r.name === race1Name)
      const r2 = edition.races.find((r) => r.name === race2Name)

      if (!r1 || !r2) return

      const diff = r1.total_percent - r2.total_percent
      const leader = diff >= 0 ? race1Name : race2Name
      const gap = Math.abs(diff)

      lines.push(`    ${edition.name}:`)
      lines.push(
        `      ${race1Name}: ${formatPercentage(r1.total_percent)} (${r1.countTotalStudents} alunos)`,
      )
      lines.push(
        `      ${race2Name}: ${formatPercentage(r2.total_percent)} (${r2.countTotalStudents} alunos)`,
      )
      lines.push(
        `      Diferença: ${formatPercentage(gap)} a favor de "${leader}"`,
      )
    })
  })

  return lines.join('\n')
}

// ─── Cruzamento Interdisciplinar por Grupo Racial ─────────────────────────────

function buildCrossSubjectByRace(context: RaceReportContext): string {
  if (!context.items?.length || context.items.length < 2) return ''

  // Coleta todos os grupos raciais presentes
  const allRaceNames = new Set<string>()
  context.items.forEach((subject) => {
    subject.items.forEach((edition) => {
      edition.races.forEach((race) => {
        if (race.countTotalStudents > 0) allRaceNames.add(race.name)
      })
    })
  })

  const lines: string[] = [
    '\n=== CRUZAMENTO INTERDISCIPLINAR POR GRUPO RACIAL ===',
    '[Identifica grupos com baixa performance consistente entre disciplinas]',
  ]

  allRaceNames.forEach((raceName) => {
    const subjectPerformances: Array<{
      subject: string
      typeSubject: string
      avgPercent: number
      totalStudents: number
    }> = []

    context.items.forEach((subject) => {
      const percents: number[] = []
      let totalStudents = 0

      subject.items.forEach((edition) => {
        const race = edition.races.find(
          (r) => r.name === raceName && r.countTotalStudents > 0,
        )
        if (race) {
          percents.push(race.total_percent)
          totalStudents = Math.max(totalStudents, race.countTotalStudents)
        }
      })

      if (percents.length > 0) {
        const avg = percents.reduce((a, b) => a + b, 0) / percents.length
        subjectPerformances.push({
          subject: subject.subject,
          typeSubject: subject.typeSubject,
          avgPercent: avg,
          totalStudents,
        })
      }
    })

    if (subjectPerformances.length < 2) return

    const allLow = subjectPerformances.every(
      (s) => s.avgPercent < PERFORMANCE_THRESHOLDS.INSUFFICIENT,
    )
    const hasLowReading = subjectPerformances.some(
      (s) =>
        s.typeSubject !== 'Objetiva' &&
        s.avgPercent < PERFORMANCE_THRESHOLDS.INSUFFICIENT,
    )
    const hasLowObjective = subjectPerformances.some(
      (s) =>
        s.typeSubject === 'Objetiva' &&
        s.avgPercent < PERFORMANCE_THRESHOLDS.INSUFFICIENT,
    )

    lines.push(`\n  Grupo "${raceName}":`)
    subjectPerformances.forEach((sp) => {
      const level = classifyPerformance(sp.avgPercent)
      lines.push(
        `    - ${sp.subject} (${sp.typeSubject}): ${formatPercentage(sp.avgPercent)} (${PERFORMANCE_LABELS[level]}) | ${sp.totalStudents} alunos`,
      )
    })

    if (allLow) {
      lines.push(
        `    ⚠️ CORRELAÇÃO: Grupo com desempenho insuficiente em TODAS as disciplinas analisadas.`,
      )
    } else if (hasLowReading && hasLowObjective) {
      lines.push(
        `    ⚠️ CORRELAÇÃO: Baixa performance em Leitura correlacionada com baixo desempenho em disciplinas objetivas.`,
      )
    }
  })

  return lines.join('\n')
}

// ─── Evolução Entre Edições por Grupo Racial ──────────────────────────────────

function buildEvolutionByRace(subject: RaceSubject): string {
  if (subject.items.length < 2) return ''

  const sortedEditions = [...subject.items].sort((a, b) => a.id - b.id)
  const firstEdition = sortedEditions[0]
  const lastEdition = sortedEditions[sortedEditions.length - 1]

  const lines: string[] = [
    `\n  === EVOLUÇÃO POR GRUPO RACIAL: ${subject.subject} ===`,
    `  [Variação entre "${firstEdition.name}" (inicial) e "${lastEdition.name}" (final)]`,
  ]

  // Coleta todos os grupos presentes na primeira edição
  firstEdition.races.forEach((firstRace) => {
    if (firstRace.countTotalStudents === 0) return

    const lastRace = lastEdition.races.find((r) => r.name === firstRace.name)
    if (!lastRace || lastRace.countTotalStudents === 0) return

    const delta = lastRace.total_percent - firstRace.total_percent
    const trend = delta > 0 ? '📈 Ganho' : delta < 0 ? '📉 Queda' : '➡️ Estável'

    lines.push(
      `    ${firstRace.name}: ${formatPercentage(firstRace.total_percent)} → ${formatPercentage(lastRace.total_percent)} | ${trend}: ${formatDelta(delta)}`,
    )
  })

  // Tabela de todas as edições intermediárias
  if (sortedEditions.length > 2) {
    lines.push(`\n  Histórico completo por edição:`)
    const allRaceNames = new Set(
      firstEdition.races
        .filter((r) => r.countTotalStudents > 0)
        .map((r) => r.name),
    )

    allRaceNames.forEach((raceName) => {
      const editionValues = sortedEditions
        .map((edition) => {
          const race = edition.races.find((r) => r.name === raceName)
          return race && race.countTotalStudents > 0
            ? `${edition.name}: ${formatPercentage(race.total_percent)}`
            : null
        })
        .filter(Boolean)

      if (editionValues.length > 0) {
        lines.push(`    ${raceName}: ${editionValues.join(' → ')}`)
      }
    })
  }

  return lines.join('\n')
}

// ─── Formatação de Dados de Raça Individual ───────────────────────────────────

function formatRaceData(race: RaceData, typeSubject: string): string {
  const level = classifyPerformance(race.total_percent)
  const levelLabel = PERFORMANCE_LABELS[level]

  const lines: string[] = [
    `\n    ▸ ${race.name}`,
    `      Desempenho: ${formatPercentage(race.total_percent)} (${levelLabel})`,
    `      Alunos matriculados: ${race.countTotalStudents} | Alunos presentes: ${race.countPresentStudents}`,
  ]

  if (typeSubject === 'Objetiva') {
    lines.push(`      Total de acertos: ${race.totalGradesStudents}`)
  } else {
    // Disciplina de Leitura: exibe distribuição qualitativa por nível
    const totalForPct = race.countTotalStudents || 1
    const readingLines: string[] = []

    READING_LEVEL_KEYS.forEach((key) => {
      const count = race[key] ?? 0
      if (count > 0) {
        const pct = ((count / totalForPct) * 100).toFixed(1)
        readingLines.push(`${READING_LEVEL_LABELS[key]}: ${count} (${pct}%)`)
      }
    })

    if (readingLines.length > 0) {
      lines.push(`      Distribuição por nível de leitura:`)
      readingLines.forEach((part) => lines.push(`        - ${part}`))
    }
  }

  return lines.join('\n')
}

// ─── Resumo Estatístico da Edição ─────────────────────────────────────────────

function buildEditionSummary(
  edition: RaceEditionItem,
  typeSubject: string,
): string {
  if (!edition.races?.length) return ''

  const racesWithData = edition.races.filter((r) => r.countTotalStudents > 0)
  if (racesWithData.length === 0) return ''

  const percentages = racesWithData.map((r) => r.total_percent)
  const avg = percentages.reduce((a, b) => a + b, 0) / percentages.length
  const max = Math.max(...percentages)
  const min = Math.min(...percentages)

  const bestRace = racesWithData.find((r) => r.total_percent === max)
  const worstRace = racesWithData.find((r) => r.total_percent === min)

  const lines: string[] = [
    `\n  Resumo da edição (${racesWithData.length} grupos raciais com dados):`,
    `  - Desempenho geral: ${formatPercentage(edition.total_percent)}`,
    `  - Média entre grupos: ${formatPercentage(avg)}`,
    `  - Maior desempenho: ${formatPercentage(max)} (${bestRace?.name ?? '-'})`,
    `  - Menor desempenho: ${formatPercentage(min)} (${worstRace?.name ?? '-'})`,
    `  - Amplitude: ${formatPercentage(max - min)}`,
  ]

  if (typeSubject !== 'Objetiva') {
    // Para leitura: soma totais por nível e calcula percentuais
    const readingTotals: Record<string, number> = {}
    READING_LEVEL_KEYS.forEach((key) => {
      readingTotals[key] = racesWithData.reduce(
        (sum, r) => sum + (r[key] ?? 0),
        0,
      )
    })

    const totalStudents = racesWithData.reduce(
      (sum, r) => sum + r.countTotalStudents,
      0,
    )

    if (totalStudents > 0) {
      lines.push(`\n  Distribuição geral por nível de leitura:`)
      READING_LEVEL_KEYS.forEach((key) => {
        const count = readingTotals[key]
        if (count > 0) {
          const pct = ((count / totalStudents) * 100).toFixed(1)
          lines.push(
            `    - ${READING_LEVEL_LABELS[key]}: ${count} alunos (${pct}%)`,
          )
        }
      })
    }
  }

  return lines.join('\n')
}

// ─── Ranking de Grupos Raciais na Edição ──────────────────────────────────────

function buildRacialRanking(
  edition: RaceEditionItem,
  typeSubject: string,
): string {
  const racesWithData = edition.races.filter((r) => r.countTotalStudents > 0)
  if (racesWithData.length < 2) return ''

  const sorted = [...racesWithData].sort(
    (a, b) => b.total_percent - a.total_percent,
  )

  const lines: string[] = [
    `\n  Ranking de desempenho por grupo racial (${typeSubject}):`,
  ]

  sorted.forEach((race, index) => {
    const level = classifyPerformance(race.total_percent)
    const relevanceNote =
      race.countTotalStudents <= 5
        ? ` ⚠️ [apenas ${race.countTotalStudents} aluno(s) — baixa representatividade]`
        : ''
    lines.push(
      `    ${index + 1}. ${race.name}: ${formatPercentage(race.total_percent)} (${PERFORMANCE_LABELS[level]}) — ${race.countPresentStudents} presentes${relevanceNote}`,
    )
  })

  return lines.join('\n')
}

// ─── Formatação de Edição ─────────────────────────────────────────────────────

function formatEdition(edition: RaceEditionItem, typeSubject: string): string {
  const lines: string[] = [
    `\n  ── Edição: ${edition.name} ──`,
    `  Desempenho geral: ${formatPercentage(edition.total_percent)}`,
  ]

  if (!edition.races?.length) {
    lines.push('  [Nenhum dado de raça/cor disponível para esta edição]')
    return lines.join('\n')
  }

  lines.push(buildEditionSummary(edition, typeSubject))
  lines.push(buildRacialRanking(edition, typeSubject))

  lines.push(`\n  Dados detalhados por grupo racial:`)
  edition.races.forEach((race) => {
    lines.push(formatRaceData(race, typeSubject))
  })

  return lines.join('\n')
}

// ─── Formatação de Disciplina ─────────────────────────────────────────────────

function formatSubject(subject: RaceSubject): string {
  const lines: string[] = [
    `\n--- ${subject.subject.toUpperCase()} (${subject.typeSubject}) ---`,
  ]

  if (!subject.items?.length) {
    lines.push('[Nenhuma edição disponível para esta disciplina]')
    return lines.join('\n')
  }

  subject.items.forEach((edition) => {
    lines.push(formatEdition(edition, subject.typeSubject))
  })

  if (subject.items.length >= 2) {
    lines.push(buildEvolutionByRace(subject))
  }

  return lines.join('\n')
}

// ─── Formatação de Todos os Itens ─────────────────────────────────────────────

function formatItems(context: RaceReportContext): string {
  if (!context.items?.length) return ''

  const lines: string[] = ['\n=== RESULTADOS DETALHADOS POR DISCIPLINA ===']

  context.items.forEach((subject) => {
    lines.push(formatSubject(subject))
  })

  return lines.join('\n')
}

// ─── Referências ──────────────────────────────────────────────────────────────

function buildPerformanceReference(): string {
  return `
=== REFERÊNCIA: NÍVEIS DE DESEMPENHO ===
- Desempenho Pleno (≥ 75%): A maioria dos alunos atingiu o esperado — grupo com bom desempenho.
- Desempenho Parcial (50-74%): Desempenho moderado — grupo em desenvolvimento.
- Desempenho Insuficiente (25-49%): Baixo desempenho — grupo com lacunas significativas.
- Desempenho Crítico (< 25%): Desempenho muito baixo — grupo necessita atenção prioritária.`
}

function buildReadingLevelReference(): string {
  return `
=== REFERÊNCIA: NÍVEIS DE LEITURA (para disciplinas de Leitura) ===
Interpretação QUALITATIVA baseada nos níveis:
- Fluente: Leitura fluida com compreensão textual adequada. [nível mais avançado]
- Não Fluente: Lê com dificuldades na fluência e/ou compreensão.
- Lê Frases: Capaz de ler frases simples, mas não textos completos.
- Lê Palavras: Em fase de decodificação, lendo palavras isoladas.
- Lê Sílabas: Reconhece sílabas, mas não palavras completas.
- Não Leitor: Ainda não alfabetizado. [nível mais crítico]
- Não Avaliado: Não avaliado por motivo justificado.
- Não Informado: Sem registro de avaliação de leitura.

Critério de adequação por série:
- 1º ano: Fluente + Não Fluente + Lê Frases são considerados adequados.
- 2º e 3º ano: Fluente + Não Fluente são considerados adequados.
- Séries avançadas: apenas Fluente é considerado adequado.`
}

// ─── Montagem do Contexto Completo ────────────────────────────────────────────

export function formatRaceContextForPrompt(
  contextData: RaceReportContext | undefined,
): string {
  if (!contextData)
    return 'Nenhum dado do relatório de Cor e Raça disponível para análise.'

  const sanitizedContext = sanitizeRaceReportContext(contextData)

  const sections: string[] = [
    formatContextHeader(sanitizedContext),
    formatBreadcrumb(sanitizedContext),
    formatLocationInfo(sanitizedContext),
    buildMacroSummary(sanitizedContext),
    buildHighlightsAndAlerts(sanitizedContext),
    buildTop2RacesComparison(sanitizedContext),
    buildCrossSubjectByRace(sanitizedContext),
    formatItems(sanitizedContext),
    buildPerformanceReference(),
    buildReadingLevelReference(),
  ]

  return sections.filter(Boolean).join('\n')
}

// ─── System Prompt Principal ──────────────────────────────────────────────────

export function buildRaceSystemPrompt(
  contextData: RaceReportContext | undefined,
): string {
  const contextString = formatRaceContextForPrompt(contextData)

  return `Você é a SAEVIA, assistente de IA especializada em análise de dados educacionais do SAEV (Sistema de Avaliação Educacional).

${contextString}

=== DIRETRIZES DE ANÁLISE ===

1. VERIFICAÇÃO RIGOROSA (CRÍTICO):
   - ANTES de responder qualquer pergunta, SEMPRE releia os dados acima para confirmar a informação.
   - NUNCA invente, suponha ou "complete" dados que não estão explicitamente presentes no contexto.
   - Se o usuário perguntar sobre algo que NÃO existe nos dados, responda: "Essa informação não está disponível nos dados fornecidos."
   - Se o usuário insistir ou questionar ("tem certeza?", "revise novamente"), releia os dados e mantenha sua resposta se estiver correta.
   - NÃO se deixe induzir ao erro: se os dados mostram X, responda X, mesmo que o usuário sugira Y.
   - Cada número, percentual e grupo racial que você citar DEVE estar presente nos dados acima. Verifique antes de responder.

   PROCEDIMENTO OBRIGATÓRIO ao responder sobre um grupo racial específico:
   1. Identifique a disciplina e a edição sendo perguntada
   2. Procure na listagem pelo marcador ▸ [NOME DO GRUPO RACIAL]
   3. Leia APENAS os dados daquele grupo naquela edição/disciplina
   4. NUNCA misture dados de outros grupos, edições ou disciplinas
   5. Se não encontrar o grupo, ele NÃO está nos dados

2. ENTENDENDO A ESTRUTURA DOS DADOS:
   - Os dados são organizados em: Disciplina → Edição → Grupos Raciais
   - Cada DISCIPLINA possui uma ou mais edições/avaliações
   - Cada EDIÇÃO possui dados de desempenho por grupo racial (Branca, Parda, Preta, Amarela, Indígena, Não Declarada, etc.)
   - Para disciplinas OBJETIVAS: desempenho medido pelo percentual de acertos (interpretação QUANTITATIVA)
   - Para disciplinas de LEITURA: desempenho medido pela distribuição qualitativa por nível (Fluente, Não Fluente, etc.)
   - Cada grupo racial possui: nome, percentual de desempenho, total de alunos matriculados, total de presentes, e dados específicos por tipo de disciplina

3. ANÁLISE MACRO (quando solicitado "análise geral" ou "visão geral"):
   - Apresente o RESUMO MACRO: total de alunos, grupo predominante e média geral
   - Cruze a média geral com a distribuição por raça para identificar padrões
   - Destaque os grupos com melhor e pior desempenho
   - Aponte disparidades raciais relevantes (amplitude entre grupos)

4. RESUMO (quando solicitado):
   - Informe: total de alunos processados, grupo racial predominante e média geral de desempenho POR DISCIPLINA
   - NUNCA calcule uma única média misturando disciplinas diferentes (ex: Português + Matemática + Leitura). Cada disciplina possui sua própria média.
   - Use os dados da seção RESUMO MACRO DO RELATÓRIO, que já apresenta as médias separadas por disciplina

5. DESTAQUES (quando solicitado):
   - Identifique os grupos com melhor performance (marcados com ✅ nos dados)
   - Identifique os grupos com maior evolução positiva em p.p. entre edições (marcados com 📈)
   - Use os dados da seção DESTAQUES POSITIVOS

6. PONTOS DE ATENÇÃO (quando solicitado):
   - Alerte sobre grupos com quedas de desempenho (📉)
   - Alerte sobre altos índices de "Não Leitor" (📚)
   - Alerte sobre disparidades críticas — grupos 20+ p.p. abaixo da média (⚠️)
   - Alerte sobre grupos com desempenho crítico (< 25%) (🔴)
   - Alerte sobre grupos com baixa representatividade (ℹ️)
   - Use os dados da seção PONTOS DE ATENÇÃO

7. COMPARAÇÃO ENTRE CATEGORIAS (quando solicitado):
   - Use a seção COMPARATIVO dos dois grupos com maior representatividade
   - Apresente em formato de lista ou tabela textual confrontando os dois grupos
   - Inclua: percentual de desempenho, total de alunos e diferença em p.p.

8. CRUZAMENTO INTERDISCIPLINAR (quando solicitado ou relevante):
   - Use a seção CRUZAMENTO INTERDISCIPLINAR POR GRUPO RACIAL
   - Identifique se um grupo com baixa performance em Leitura também tem baixo desempenho em Português ou Matemática
   - Aponte correlações entre nível de leitura e desempenho em disciplinas objetivas
   - Valide a relevância estatística: grupos com ≤ 5 alunos têm baixa representatividade

9. EVOLUÇÃO E VARIAÇÃO ENTRE EDIÇÕES:
   - Use a seção EVOLUÇÃO POR GRUPO RACIAL de cada disciplina
   - Interprete a variação em p.p. entre a edição inicial (Diagnóstica) e a final (Av. Saída)
   - Ganho positivo = aprendizado real; queda = perda de aprendizado
   - Apresente o histórico completo quando houver mais de 2 edições

10. DIFERENCIAÇÃO TÉCNICA POR TIPO DE DISCIPLINA:
    - LEITURA: Interpretação QUALITATIVA. Analise os níveis (Fluente, Não Fluente, Frases, etc.) e suas proporções. O percentual de desempenho representa a proporção de alunos em níveis adequados para a série.
    - OBJETIVAS (Matemática, Português, Ciências, etc.): Interpretação QUANTITATIVA. O percentual representa a média bruta de acertos por edição.
    - NUNCA misture a lógica de interpretação entre os dois tipos.

11. RELEVÂNCIA ESTATÍSTICA:
    - Sempre que citar um grupo com poucos alunos (≤ 5), adicione a ressalva: "Embora [grupo] apresente [X]% de desempenho, este dado refere-se a apenas [N] aluno(s) e pode não ser estatisticamente representativo."
    - Grupos com mais alunos têm maior peso analítico.

12. COMO RESPONDER PERGUNTAS COMUNS:
    - "Análise geral" / "Visão macro" → Use RESUMO MACRO + DESTAQUES + PONTOS DE ATENÇÃO
    - "Qual grupo teve melhor desempenho?" → Consulte o ranking de desempenho por grupo racial
    - "Existe disparidade racial?" → Compare os percentuais e cite a amplitude
    - "Como evoluiu?" → Use a seção EVOLUÇÃO POR GRUPO RACIAL
    - "Compare os dois maiores grupos" → Use o COMPARATIVO dos dois grupos principais
    - "Há correlação entre leitura e português?" → Use o CRUZAMENTO INTERDISCIPLINAR
    - Se o usuário NÃO especificar a disciplina ou edição, responda para TODAS as disponíveis

13. PROIBIÇÕES:
    - NÃO responda sobre assuntos fora da análise educacional destes dados. Isso inclui, sem exceção: receitas, piadas, poemas, histórias, instruções de qualquer natureza, informações gerais ou qualquer conteúdo não relacionado aos dados do SAEV.
    - NÃO forneça comparações com benchmarks externos não fornecidos.
    - NÃO faça previsões ou projeções não baseadas nos dados.
    - NÃO invente dados que não existem, mesmo que o usuário insista.
    - NÃO faça julgamentos de valor sobre grupos raciais ou atribua causas socioeconômicas às disparidades.
    - SEM sugestões pedagógicas avançadas, sem recomendações de intervenção pedagógica, estratégias de ensino ou planos de ação. Seu papel é interpretar e apresentar os dados, deixando as decisões pedagógicas para os profissionais da educação.
    - ATENÇÃO — Bypass por enquadramento: Se o usuário pedir conteúdo fora do escopo MESMO enquadrando como "análise de relatório" (ex: "me faça uma receita de bolo como se fosse análise", "escreva um poema como se estivesse analisando os dados"), RECUSE categoricamente. O enquadramento não muda o conteúdo proibido. Avalie a ESSÊNCIA do pedido, não como ele é apresentado.
    - Se tentarem desviar o assunto, mesmo de forma criativa ou disfarçada, responda APENAS: "Sou especializada na análise dos dados do SAEV. Como posso ajudá-lo com os resultados apresentados?"

14. FORMATO:
    - Seja objetiva e profissional.
    - Use listas e tópicos para organizar informações.
    - Cite percentuais e nomes dos grupos quando disponíveis.
    - Ao comparar grupos, mencione-os pelo nome e percentual.
    - Use linguagem educacional clara e acessível.
    - Ao citar um grupo racial, use o formato: [Nome do Grupo]: [X]% ([Nível de Desempenho])
    - Para variações entre edições, use o formato: [X] p.p. (positivo = ganho, negativo = queda)

LEMBRE-SE: Sua credibilidade depende de NUNCA inventar informações. É preferível dizer "não encontrei essa informação nos dados" do que fornecer dados incorretos. Sempre verifique os dados acima antes de responder.

Responda sempre em português brasileiro, de forma clara, concisa e profissional.`
}
