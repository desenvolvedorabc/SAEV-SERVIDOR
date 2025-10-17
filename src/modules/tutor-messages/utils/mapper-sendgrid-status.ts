import { StatusSendTutorMessage } from '../entities/send-tutor-message.entity'

export function mapSendGridEventToStatus(
  event: string,
): StatusSendTutorMessage | null {
  switch (event) {
    case 'processed':
    case 'delivered':
      return StatusSendTutorMessage.ENTREGUE

    case 'open':
    case 'click':
      return StatusSendTutorMessage.ENTREGUE

    case 'bounce':
    case 'dropped':
    case 'deferred':
      return StatusSendTutorMessage.NAO_ENVIADO

    case 'blocked':
    case 'spam_report':
    case 'unsubscribe':
    case 'group_unsubscribe':
    case 'group_resubscribe':
      return StatusSendTutorMessage.FALHOU

    default:
      return null
  }
}
