import {
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common'

export class InternalServerError extends InternalServerErrorException {
  constructor() {
    super('Houve um erro interno. Tente novamente depois.')
  }
}

export class ForbiddenError extends ForbiddenException {
  constructor(text?: string) {
    super(text ?? 'Você não possui permissão para executar esta ação.')
  }
}

export class ForbiddenInvalidCredentials extends ForbiddenException {
  constructor() {
    super('Credencias inválidas. Verifique e tente novamente.')
  }
}
