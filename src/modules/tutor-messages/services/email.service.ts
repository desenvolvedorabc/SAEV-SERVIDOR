import { Injectable } from '@nestjs/common'
import * as sgMail from '@sendgrid/mail'

import { createEmailTemplate } from '../utils/markdown-to-html'

@Injectable()
export class EmailService {
  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY!
    sgMail.setApiKey(apiKey)
  }

  async send(
    sendTutorMessageId: number,
    content: string,
    subject: string,
    to: string,
  ) {
    const htmlContent = createEmailTemplate(subject, content)

    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject,
      html: htmlContent,
      customArgs: {
        sendTutorMessageId: sendTutorMessageId.toString(),
      },
      trackingSettings: {
        clickTracking: {
          enable: true,
        },
        openTracking: {
          enable: true,
        },
      },
    }

    await sgMail.send(msg)
  }
}
