import { Module } from '@nestjs/common';
import { ExternalReportsService } from './external-reports.service';
import { ExternalReportsController } from './external-reports.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExternalReport } from './entities/external-report.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ExternalReport])],
  controllers: [ExternalReportsController],
  providers: [ExternalReportsService]
})
export class ExternalReportsModule {}
