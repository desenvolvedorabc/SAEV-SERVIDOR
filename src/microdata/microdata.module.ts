import { Module } from '@nestjs/common';
import { MicrodataService } from './microdata.service';
import { MicrodataController } from './microdata.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Microdatum } from './entities/microdatum.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Microdatum])],
  controllers: [MicrodataController],
  providers: [MicrodataService]
})
export class MicrodataModule {}
