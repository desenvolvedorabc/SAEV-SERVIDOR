import { SendTutorMessageStatus } from 'src/modules/tutor-messages/entities/send-tutor-message.entity'

export function mapSendGridEventToStatus(
  event: string,
): SendTutorMessageStatus | null {
  switch (event) {
    case 'processed':
    case 'delivered':
      return SendTutorMessageStatus.ENTREGUE

    case 'open':
    case 'click':
      return SendTutorMessageStatus.ENTREGUE

    case 'bounce':
    case 'dropped':
    case 'deferred':
      return SendTutorMessageStatus.NAO_ENVIADO

    case 'blocked':
    case 'spam_report':
    case 'unsubscribe':
    case 'group_unsubscribe':
    case 'group_resubscribe':
      return SendTutorMessageStatus.FALHOU

    default:
      return null
  }
}
