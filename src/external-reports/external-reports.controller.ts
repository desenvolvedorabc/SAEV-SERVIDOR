import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  Put,
} from "@nestjs/common";
import { ExternalReportsService } from "./external-reports.service";
import { CreateExternalReportDto } from "./dto/create-external-report.dto";
import { UpdateExternalReportDto } from "./dto/update-external-report.dto";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PaginationParams } from "src/helpers/params";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth.guard";
import { CurrentUser } from "src/auth/decorator/current-user.decorator";
import { User } from "src/user/model/entities/user.entity";

@Controller("external-reports")
@ApiTags("Relatórios Externos")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExternalReportsController {
  constructor(
    private readonly externalReportsService: ExternalReportsService,
  ) {}

  @Post()
  create(
    @Body() createExternalReportDto: CreateExternalReportDto,
    @CurrentUser() user: User,
  ) {
    if (user?.USU_SPE?.SPE_PER?.PER_NOME !== "SAEV") {
      throw new ForbiddenException();
    }
    return this.externalReportsService.create(createExternalReportDto, user);
  }

  @Get()
  findAll(@Query() params: PaginationParams, @CurrentUser() user: User) {
    return this.externalReportsService.findAll(params, user);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.externalReportsService.findOne(+id);
  }

  @Put(":id/toggle-active")
  toggleActive(@Param("id") id: string, @CurrentUser() user: User) {
    if (user?.USU_SPE?.SPE_PER?.PER_NOME !== "SAEV") {
      throw new ForbiddenException();
    }

    return this.externalReportsService.toggleActive(+id, user);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateExternalReportDto: UpdateExternalReportDto,
    @CurrentUser() user: User,
  ) {
    if (user?.USU_SPE?.SPE_PER?.PER_NOME !== "SAEV") {
      throw new ForbiddenException();
    }

    return this.externalReportsService.update(
      +id,
      updateExternalReportDto,
      user,
    );
  }
}
