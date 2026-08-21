import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { TermsDocument } from './entities/terms-document.entity'

@Injectable()
export class TermsService {
  constructor(
    @InjectRepository(TermsDocument)
    private readonly termsDocumentRepository: Repository<TermsDocument>,
  ) {}

  async getCurrentTerms(): Promise<TermsDocument | null> {
    return this.termsDocumentRepository.findOne({
      where: { active: true },
      order: { createdAt: 'DESC' },
    })
  }

  async getTermsStatus(termsAcceptedAt: Date | null): Promise<{
    needsAcceptance: boolean
    url: string
  } | null> {
    const currentTerms = await this.getCurrentTerms()

    if (!currentTerms) {
      return null
    }

    const needsAcceptance =
      !termsAcceptedAt || termsAcceptedAt < currentTerms.createdAt

    return { needsAcceptance, url: currentTerms.url }
  }
}
