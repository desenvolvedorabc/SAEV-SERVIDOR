import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common'
import { Request } from 'express'
import { validateRequest } from 'twilio'

@Injectable()
export class TwilioSignatureGuard implements CanActivate {
  private readonly logger = new Logger(TwilioSignatureGuard.name)

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()
    const signature = request.headers['x-twilio-signature'] as string

    if (!signature) {
      this.logger.error('Missing x-twilio-signature header')
      throw new ForbiddenException('Missing signature')
    }

    const authToken = process.env.TWILIO_AUTH_TOKEN
    const url = `${process.env.HOST_APP_URL}${request.originalUrl}`
    const body = request.body

    const isValid = validateRequest(authToken, signature, url, body)

    if (!isValid) {
      this.logger.error('Invalid Twilio signature')
      throw new ForbiddenException('Invalid signature')
    }

    return true
  }
}
