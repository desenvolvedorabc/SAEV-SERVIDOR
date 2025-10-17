import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Serie } from 'src/modules/serie/model/entities/serie.entity'
import { Subject } from 'src/modules/subject/model/entities/subject.entity'

import { HeadquartersController } from './controller/headquarters.controller'
import { Headquarter } from './model/entities/headquarter.entity'
import { HeadquarterTopic } from './model/entities/headquarter-topic.entity'
import { HeadquarterTopicItem } from './model/entities/headquarter-topic-item.entity'
import { HeadquartersService } from './service/headquarters.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Headquarter,
      HeadquarterTopic,
      HeadquarterTopicItem,
      Serie,
      Subject,
    ]),
  ],
  providers: [HeadquartersService],
  controllers: [HeadquartersController],
})
export class HeadquartersModule {}
