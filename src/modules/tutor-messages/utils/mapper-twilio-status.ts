import { StatusSendTutorMessage } from '../entities/send-tutor-message.entity'

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

export function mapTwilioToTutorStatus(status: string): StatusSendTutorMessage {
  const s = (status || '').toLowerCase() as
    | TwilioMessageStatus
    | TwilioInboundStatus

  switch (s) {
    case 'accepted':
    case 'scheduled':
    case 'queued':
    case 'sending':
    case 'receiving':
      return StatusSendTutorMessage.PENDENTE

    case 'sent':
      return StatusSendTutorMessage.ENVIADO

    case 'delivered':
    case 'read':
    case 'received':
      return StatusSendTutorMessage.ENTREGUE

    case 'undelivered':
      return StatusSendTutorMessage.NAO_ENVIADO
    case 'failed':
      return StatusSendTutorMessage.FALHOU
    case 'canceled':
      return StatusSendTutorMessage.NAO_ENVIADO

    default:
      return null
  }
}
