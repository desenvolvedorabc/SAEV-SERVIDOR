import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { CountiesModule } from '../counties/counties.module'
import { SchoolModule } from '../school/school.module'
import { StatesModule } from '../states/states.module'
import { Regional } from './model/entities/regional.entity'
import { RegionalController } from './regional.controller'
import { RegionalService } from './regional.service'
import { MunicipalRegionalService } from './services/municipal-regional.service'
import { SingleRegionalService } from './services/single-regional.service'
import { StateRegionalService } from './services/state-regional.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([Regional]),
    StatesModule,
    CountiesModule,
    SchoolModule,
  ],
  providers: [
    RegionalService,
    StateRegionalService,
    MunicipalRegionalService,
    SingleRegionalService,
  ],
  controllers: [RegionalController],
  exports: [RegionalService],
})
export class RegionalModule {}
