import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { SubProfile } from "src/profile/model/entities/sub-profile.entity";
import { User } from "src/user/model/entities/user.entity";

type RequestType = {
  user: User;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<RequestType>();

    const sub = request.user.USU_SPE as any as SubProfile;
    const requiredRoles = this.reflector.get<string[]>(
      "roles",
      context.getHandler(),
    );

    if (requiredRoles?.length > 0) {
      const hasAllRoles = sub.AREAS.some((area) => {
        return requiredRoles.includes(area.ARE_DESCRICAO);
      });

      if (!hasAllRoles) {
        return false;
      }
    }

    return true;
  }
}
