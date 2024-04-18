import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ReleaseResultsModule } from "src/release-results/release-results.module";
import { SystemLogsController } from "./controller/system-logs.controller";
import { SystemLogs } from "./model/entities/system-log.entity";
import { SystemLogsService } from "./service/system-logs.service";

@Module({
  imports: [TypeOrmModule.forFeature([SystemLogs]), ReleaseResultsModule],
  providers: [SystemLogsService],
  controllers: [SystemLogsController],
  exports: [SystemLogsService],
})
export class SystemLogsModule {}
