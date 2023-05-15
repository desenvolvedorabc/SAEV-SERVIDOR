import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { CurrentUser } from "src/auth/decorator/current-user.decorator";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth.guard";
import { PaginationParams } from "src/helpers/params";
import { User } from "src/user/model/entities/user.entity";
import { ReportsService } from "../service/reports.service";

@Controller("reports")
@ApiTags("Relatórios")
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/grouping")
  grouping(
    @Query()
    paginationParams: PaginationParams,
    @CurrentUser() user: User,
  ) {
    return this.reportsService.grouping(paginationParams, user);
  }
  
  // colocar no findOne serie o user pra evolutionary line

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/municipality-level")
  municipalityLevel(
    @Query()
    paginationParams: PaginationParams,
    @CurrentUser() user: User,
  ) {
    return this.reportsService.performanceLevel(paginationParams, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/general-synthesis")
  generalSynthesis(
    @CurrentUser() user: User,
    @Query()
    paginationParams: PaginationParams,
  ) {
    return this.reportsService.generalSynthesis(paginationParams, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/evolutionary-line")
  evolutionaryLine(
    @Query()
    paginationParams: PaginationParams,
    @CurrentUser() user: User,
  ) {
    return this.reportsService.evolutionaryLine(paginationParams, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/releases")
  releases(
    @Query()
    paginationParams: PaginationParams,
    @CurrentUser() user: User,
  ) {
    return this.reportsService.releases(paginationParams, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/result-by-descriptors")
  resultByDescriptors(
    @Query()
    paginationParams: PaginationParams,
    @CurrentUser() user: User,
  ) {
    return this.reportsService.resultByDescriptors(paginationParams, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/evolutionary-line-student/:idStudent/:year")
  evolutionaryLineByStudent(
    @Param("idStudent") idStudent: string,
    @Param("year") year: string,
  ) {
    return this.reportsService.evolutionaryLineByStudent(year, idStudent);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/general-synthesis/csv")
  async excel(
    @Query()
    paginationParams: PaginationParams,
    @Res() response: Response,
    @CurrentUser() user: User,

  ) {
    const data = await this.reportsService.generateCsvGeneralSynthesis(
      paginationParams,
      user
    );

    response.setHeader("Content-Type", "text/csv");
    response.header(
      "Content-disposition",
      "attachment; filename=general_synthensis.csv",
    );
    return response.status(200).send("\ufeff" + data);
  }

  @Post("/job")
  job() {
    return this.reportsService.jobReports();
  }
}
