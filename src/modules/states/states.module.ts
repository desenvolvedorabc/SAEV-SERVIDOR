import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { State } from './model/entities/state.entity'
import { StatesController } from './states.controller'
import { StatesService } from './states.service'

@Module({
  imports: [TypeOrmModule.forFeature([State])],
  providers: [StatesService],
  controllers: [StatesController],
  exports: [StatesService],
})
export class StatesModule {}
