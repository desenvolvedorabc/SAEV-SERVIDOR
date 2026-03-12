export interface SendGridEvent {
  event: string
  email: string
  timestamp: number
  sg_event_id: string
  sg_message_id: string
  id: string
  type: 'manual' | 'automatic'
  ip?: string
}
