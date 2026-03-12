import { Injectable, Logger } from '@nestjs/common'
import { InternalServerError } from 'src/utils/errors'
import * as Twilio from 'twilio'

import { htmlToSingleLine } from '../utils/markdown-to-whatsapp'

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name)
  private client: Twilio.Twilio
  private from = process.env.TWILIO_WHATSAPP_FROM
  private contentSid = process.env.TWILIO_MESSAGING_CONTENT_SID

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID!
    const authToken = process.env.TWILIO_AUTH_TOKEN!
    this.client = Twilio(accountSid, authToken)
  }

  async sendOptInTemplate(
    to: string,
  ): Promise<{ sid: string; status: string }> {
    try {
      const msg = await this.client.messages.create({
        to: `whatsapp:+${to}`,
        from: `whatsapp:+${this.from}`,
        contentSid: this.contentSid,
      })

      return { sid: msg.sid, status: msg.status }
    } catch (error) {
      this.logger.error(`Erro ao enviar template de opt-in para ${to}:`, error)
      throw new InternalServerError()
    }
  }

  async sendFreeFormMessage(
    to: string,
    text: string,
    statusCallback: string,
  ): Promise<{ sid: string; status: string }> {
    try {
      const body = htmlToSingleLine(text)

      const msg = await this.client.messages.create({
        to: `whatsapp:+${to}`,
        from: `whatsapp:+${this.from}`,
        body,
        statusCallback,
      })

      return { sid: msg.sid, status: msg.status }
    } catch (error) {
      this.logger.error(`Erro ao enviar mensagem livre para ${to}:`, error)
      throw new InternalServerError()
    }
  }
}
