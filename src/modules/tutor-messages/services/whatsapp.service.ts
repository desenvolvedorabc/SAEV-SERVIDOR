import { Injectable } from '@nestjs/common'
import * as Twilio from 'twilio'

import { htmlToSingleLine } from '../utils/markdown-to-whatsapp'

@Injectable()
export class WhatsappService {
  private client: Twilio.Twilio
  private from = process.env.TWILIO_WHATSAPP_FROM
  private contentSid = process.env.TWILIO_MESSAGING_CONTENT_SID

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID!
    const authToken = process.env.TWILIO_AUTH_TOKEN!
    this.client = Twilio(accountSid, authToken)
  }

  async send(to: string, text: string, sendTutorMessageId: number) {
    const full = htmlToSingleLine(text)

    const msg = await this.client.messages.create({
      to: `whatsapp:+${to}`,
      from: `whatsapp:+${this.from}`,
      contentSid: this.contentSid,
      contentVariables: JSON.stringify({ 1: full }),
      statusCallback: `${process.env.HOST_APP_URL}/v1/twilio/status?sendTutorMessageId=${sendTutorMessageId}`,
    })

    return { sid: msg.sid, status: msg.status }
  }
}
