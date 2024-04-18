import { InternalServerErrorException } from "@nestjs/common";

export class InternalServerError extends InternalServerErrorException {
  constructor(text?: string) {
    super(text ?? "Houve um erro interno. Tente novamente depois.")
  }
}