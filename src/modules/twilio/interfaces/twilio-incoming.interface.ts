export interface TwilioIncoming {
  OriginalRepliedMessageSender: string
  SmsMessageSid: string
  FrequentlyForwarded: string
  NumMedia: string
  ProfileName: string
  MessageType: string
  SmsSid: string
  WaId: string
  SmsStatus: string
  Body: string
  Forwarded: string
  ButtonText: string
  To: string
  ButtonPayload: 'nao_quero_receber' | 'sim_quero_receber'
  NumSegments: string
  ReferralNumMedia: string
  MessageSid: string
  AccountSid: string
  OriginalRepliedMessageSid: string
  From: string
  ApiVersion: string
}
