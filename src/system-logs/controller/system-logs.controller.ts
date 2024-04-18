import { Controller, Get, Param, UseGuards, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guard/jwt-auth.guard";
import { Pagination } from "nestjs-typeorm-paginate";
import { PaginationParamsLogs } from "../../helpers/params";
import { SystemLogsService } from "../service/system-logs.service";
import { SystemLogs } from "../model/entities/system-log.entity";
import { User } from "src/user/model/entities/user.entity";
import { CurrentUser } from "src/auth/decorator/current-user.decorator";

@ApiTags("Logs do Sistema")
@Controller("system-logs")
export class SystemLogsController {
  constructor(private readonly systemLogsService: SystemLogsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async paginate(
    @CurrentUser() user: User,
    @Query() paginationParams: PaginationParamsLogs,
  ): Promise<Pagination<SystemLogs>> {
    return this.systemLogsService.paginate(paginationParams, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.systemLogsService.findOne(id);
  }
}
