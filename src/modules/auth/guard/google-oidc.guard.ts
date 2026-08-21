import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OAuth2Client } from 'google-auth-library'

@Injectable()
export class GoogleOidcGuard implements CanActivate {
  private readonly logger = new Logger(GoogleOidcGuard.name)
  private readonly client = new OAuth2Client()

  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()

    if (this.isLocalBypassAllowed()) {
      const bypass =
        this.configService.get<string>('LOCAL_DEV_BYPASS_HEADER') ?? '1'
      if (request.headers['x-local-dev-bypass'] === bypass) {
        this.logger.warn(
          'Request authorized via X-Local-Dev-Bypass (NEVER allow this in production)',
        )
        return true
      }
    }

    const authHeader = request.headers.authorization
    if (!authHeader || typeof authHeader !== 'string') {
      throw new ForbiddenException('Missing Authorization header')
    }

    const [scheme, token] = authHeader.split(' ')
    if (scheme !== 'Bearer' || !token) {
      throw new ForbiddenException('Invalid Authorization header')
    }

    const audience = this.configService.get<string>('WORKER_BASE_URL')
    const allowedEmails = this.getAllowedEmails()
    if (!audience || allowedEmails.length === 0) {
      throw new ForbiddenException(
        'Worker not configured (missing WORKER_BASE_URL or invoker service accounts)',
      )
    }

    try {
      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience,
      })
      const payload = ticket.getPayload()
      if (!payload) {
        throw new ForbiddenException('Invalid OIDC token payload')
      }

      const validIssuers = [
        'https://accounts.google.com',
        'accounts.google.com',
      ]
      if (!payload.iss || !validIssuers.includes(payload.iss)) {
        throw new ForbiddenException(`Invalid issuer: ${payload.iss}`)
      }

      if (!payload.email || !allowedEmails.includes(payload.email)) {
        throw new ForbiddenException(`Unexpected token email: ${payload.email}`)
      }

      return true
    } catch (err) {
      this.logger.warn(
        `OIDC verification failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
      if (err instanceof ForbiddenException) throw err
      throw new ForbiddenException('OIDC token verification failed')
    }
  }

  private isLocalBypassAllowed(): boolean {
    if (this.configService.get<string>('ALLOW_LOCAL_BYPASS') !== 'true') {
      return false
    }
    if (
      this.configService.get<string>('REPROCESS_DISPATCHER') !== 'in-process'
    ) {
      return false
    }
    return true
  }

  private getAllowedEmails(): string[] {
    const raw =
      this.configService.get<string>('INTERNAL_OIDC_ALLOWED_EMAILS') ?? ''
    const fromList = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const legacy = this.configService.get<string>(
      'CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL',
    )
    if (legacy && !fromList.includes(legacy)) {
      fromList.push(legacy)
    }
    return fromList
  }
}
