import { ForbiddenException } from '@nestjs/common'
import { User } from 'src/modules/user/model/entities/user.entity'
import { RoleProfile } from 'src/shared/enums/role.enum'

export function validateAllowedRoles(roles: RoleProfile[], user: User) {
  if (!roles?.includes(user?.USU_SPE?.role)) {
    throw new ForbiddenException(
      'Você não tem permissão para executar esta ação.',
    )
  }
}
