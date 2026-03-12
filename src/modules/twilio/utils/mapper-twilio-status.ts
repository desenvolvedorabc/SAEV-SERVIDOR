import { SendTutorMessageStatus } from 'src/modules/tutor-messages/entities/send-tutor-message.entity'

type TwilioMessageStatus =
  | 'accepted'
  | 'scheduled'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'undelivered'
  | 'failed'
  | 'canceled'

type TwilioInboundStatus = 'receiving' | 'received'

export function mapTwilioToTutorStatus(status: string): SendTutorMessageStatus {
  const s = (status || '').toLowerCase() as
    | TwilioMessageStatus
    | TwilioInboundStatus

  switch (s) {
    case 'accepted':
    case 'scheduled':
    case 'queued':
    case 'sending':
    case 'receiving':
      return SendTutorMessageStatus.PENDENTE

    case 'sent':
      return SendTutorMessageStatus.ENVIADO

    case 'delivered':
    case 'read':
    case 'received':
      return SendTutorMessageStatus.ENTREGUE

    case 'undelivered':
      return SendTutorMessageStatus.NAO_ENVIADO
    case 'failed':
      return SendTutorMessageStatus.FALHOU
    case 'canceled':
      return SendTutorMessageStatus.NAO_ENVIADO

    default:
      return null
  }
}
