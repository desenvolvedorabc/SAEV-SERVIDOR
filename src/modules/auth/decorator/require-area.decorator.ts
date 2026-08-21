import { SetMetadata } from '@nestjs/common'
import { AreaEnum } from 'src/shared/enums/area.enum'

export const REQUIRED_AREA_KEY = 'requiredArea'

/**
 * Decorator que define a área necessária para acessar a rota.
 * Deve ser usado em conjunto com o AreaGuard.
 *
 * @example
 * @RequireArea(AreaEnum.AI_ASSIST)
 * @UseGuards(JwtAuthGuard, AreaGuard)
 * @Post('/chat')
 * async chat() { ... }
 */
export const RequireArea = (area: AreaEnum) =>
  SetMetadata(REQUIRED_AREA_KEY, area)
