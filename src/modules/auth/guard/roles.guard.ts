import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable } from 'rxjs'
import { User } from 'src/modules/user/model/entities/user.entity'

type RequestType = {
  user: User
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<RequestType>()

    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    )

    if (requiredRoles?.length > 0) {
      const hasAllRoles = requiredRoles.includes(request?.user?.USU_SPE?.role)

      if (!hasAllRoles) {
        throw new ForbiddenException(
          'Você não possui permissão para executar esta ação.',
        )
      }
    }

    return true
  }
}
