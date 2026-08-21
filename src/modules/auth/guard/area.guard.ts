import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { InjectRepository } from '@nestjs/typeorm'
import { SubProfile } from 'src/modules/profile/model/entities/sub-profile.entity'
import { User } from 'src/modules/user/model/entities/user.entity'
import { Repository } from 'typeorm'

import { REQUIRED_AREA_KEY } from '../decorator/require-area.decorator'

type RequestType = {
  user: User
}

@Injectable()
export class AreaGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,

    @InjectRepository(SubProfile)
    private readonly subProfileRepository: Repository<SubProfile>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredArea = this.reflector.get<string>(
      REQUIRED_AREA_KEY,
      context.getHandler(),
    )

    if (!requiredArea) {
      return true
    }

    const request = context.switchToHttp().getRequest<RequestType>()
    const subProfileId = request.user?.USU_SPE?.SPE_ID

    if (!subProfileId) {
      throw new ForbiddenException(
        'Você não possui permissão para acessar este recurso.',
      )
    }

    const subProfile = await this.subProfileRepository.findOne(
      { SPE_ID: subProfileId },
      { relations: ['AREAS'] },
    )

    const hasArea = subProfile?.AREAS?.some(
      (area) => area.ARE_NOME === requiredArea,
    )

    if (!hasArea) {
      throw new ForbiddenException(
        'Você não possui permissão para acessar este recurso.',
      )
    }

    return true
  }
}
