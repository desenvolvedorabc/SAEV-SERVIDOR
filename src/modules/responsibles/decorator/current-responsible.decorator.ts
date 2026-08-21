import { createParamDecorator, ExecutionContext } from '@nestjs/common'

import { IResponsible } from '../model/interface/responsible.interface'

export const CurrentResponsible = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): IResponsible => {
    const request = ctx.switchToHttp().getRequest()
    return request.user
  },
)
