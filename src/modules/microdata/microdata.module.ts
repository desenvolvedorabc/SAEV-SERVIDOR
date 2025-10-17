import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Microdatum } from './entities/microdatum.entity'
import { MicrodataController } from './microdata.controller'
import { MicrodataService } from './microdata.service'
import { MicrodataRepository } from './repositories/microdata.repository'
import { MicrodataEvaluationDataStandardizedService } from './services/microdata-evaluation-data-standardized.service'

@Module({
  imports: [TypeOrmModule.forFeature([Microdatum])],
  controllers: [MicrodataController],
  providers: [
    MicrodataService,
    MicrodataRepository,
    MicrodataEvaluationDataStandardizedService,
  ],
})
export class MicrodataModule {}
