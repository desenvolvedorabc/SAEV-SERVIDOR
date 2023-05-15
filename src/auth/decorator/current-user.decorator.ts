import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IUser } from 'src/user/model/interface/user.interface';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): IUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

export const CurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user.USU_ID;
  },
);
