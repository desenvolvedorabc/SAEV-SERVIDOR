import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

import { TermsService } from './terms.service'

@Controller('terms')
@ApiTags('Termos de Uso')
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Get('/current')
  @ApiOperation({ summary: 'Obter os termos de uso vigentes' })
  async getCurrentTerms() {
    const terms = await this.termsService.getCurrentTerms()
    return terms
      ? { url: terms.url, createdAt: terms.createdAt }
      : { url: null, createdAt: null }
  }
}
