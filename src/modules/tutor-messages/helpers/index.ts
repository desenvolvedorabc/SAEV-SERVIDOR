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
): AggregatedTutorMessageStatus {
  if (emailStatus === 'PENDENTE' || waStatus === 'PENDENTE') {
    return AggregatedTutorMessageStatus.PENDENTE
  }

  if (emailStatus === 'SENT' && waStatus === 'SENT') {
    return AggregatedTutorMessageStatus.ENVIADO
  }

  if (emailStatus === 'FALHA' && waStatus === 'FALHA') {
    return AggregatedTutorMessageStatus.FALHA
  }

  if (emailStatus === 'NAO_ENVIADO' && waStatus === 'NAO_ENVIADO') {
    return AggregatedTutorMessageStatus.NAO_ENVIADO
  }

  if (emailStatus === 'FALHA' && waStatus === 'NAO_ENVIADO') {
    return AggregatedTutorMessageStatus.FALHA
  }

  if (emailStatus === 'NAO_ENVIADO' && waStatus === 'FALHA') {
    return AggregatedTutorMessageStatus.FALHA
  }

  return AggregatedTutorMessageStatus.PARCIALMENTE_ENVIADO
}
