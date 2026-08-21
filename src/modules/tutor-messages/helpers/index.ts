export enum AggregatedTutorMessageStatus {
  PENDENTE = 'PENDENTE',
  ENVIADO = 'ENVIADO',
  FALHA = 'FALHA',
  PARCIALMENTE_ENVIADO = 'PARCIALMENTE_ENVIADO',
  NAO_ENVIADO = 'NAO_ENVIADO',
}

type ChannelStatus = 'PENDENTE' | 'SENT' | 'FALHA' | 'NAO_ENVIADO' | 'PARCIAL'

export function decideChannelStatus(counts: {
  pending: number
  sent: number
  fail: number
  notSent: number
  total: number
}): ChannelStatus {
  const { pending, sent, fail, notSent, total } = counts

  if (!total) return 'NAO_ENVIADO'
  if (pending > 0) return 'PENDENTE'
  if (total > 0 && sent === total) return 'SENT'
  if (total > 0 && notSent === total) return 'NAO_ENVIADO'
  if (total > 0 && !sent) return 'FALHA'
  if (total > 0 && fail === total) return 'FALHA'

  return 'PARCIAL'
}

export function decideFinalStatus(
  emailStatus: ChannelStatus,
  waStatus: ChannelStatus,
  inAppStatus?: ChannelStatus,
): AggregatedTutorMessageStatus {
  const statuses = [emailStatus, waStatus]
  if (inAppStatus) statuses.push(inAppStatus)

  if (statuses.some((s) => s === 'PENDENTE')) {
    return AggregatedTutorMessageStatus.PENDENTE
  }

  if (statuses.every((s) => s === 'SENT')) {
    return AggregatedTutorMessageStatus.ENVIADO
  }

  if (statuses.every((s) => s === 'NAO_ENVIADO')) {
    return AggregatedTutorMessageStatus.NAO_ENVIADO
  }

  if (statuses.every((s) => s === 'FALHA' || s === 'NAO_ENVIADO')) {
    return AggregatedTutorMessageStatus.FALHA
  }

  return AggregatedTutorMessageStatus.PARCIALMENTE_ENVIADO
}

export function formatAverageTime(avgMinutes: number | null): string | null {
  if (avgMinutes === null || avgMinutes === undefined || isNaN(avgMinutes)) {
    return null
  }

  if (avgMinutes < 10) return '< 10 min'
  if (avgMinutes < 60) return `${Math.round(avgMinutes)} min`

  const totalMinutes = Math.round(avgMinutes)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours < 24) {
    return `${hours}h ${String(minutes).padStart(2, '0')}min`
  }

  const days = Math.floor(hours / 24)
  return `${days} dia${days > 1 ? 's' : ''}`
}
