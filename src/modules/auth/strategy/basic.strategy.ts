import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { BasicStrategy as Strategy } from 'passport-http'

@Injectable()
export class BasicStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      passReqToCallback: true,
    })
  }

  public validate = async (
    _,
    username: string,
    password: string,
  ): Promise<boolean> => {
    if (
      (this.configService.get<string>('HTTP_BASIC_USER_HERBY') === username &&
        this.configService.get<string>('HTTP_BASIC_PASS_HERBY') === password) ||
      (this.configService.get<string>('HTTP_BASIC_USER_EDLER') === username &&
        this.configService.get<string>('HTTP_BASIC_PASS_EDLER') === password) ||
      (this.configService.get<string>('HTTP_BASIC_USER_IMPORT_STUDENT') ===
        username &&
        this.configService.get<string>('HTTP_BASIC_PASS_IMPORT_STUDENT') ===
          password)
    ) {
      return true
    }
    throw new UnauthorizedException()
  }
}
