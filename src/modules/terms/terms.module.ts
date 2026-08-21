import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { TermsDocument } from './entities/terms-document.entity'
import { TermsController } from './terms.controller'
import { TermsService } from './terms.service'

@Module({
  imports: [TypeOrmModule.forFeature([TermsDocument])],
  controllers: [TermsController],
  providers: [TermsService],
  exports: [TermsService],
})
export class TermsModule {}
