import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const GetSchoolId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest()
    return request?.user?.USU_ESC?.ESC_ID
  },
)
