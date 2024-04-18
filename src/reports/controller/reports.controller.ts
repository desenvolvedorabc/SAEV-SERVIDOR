import { Controller, Get, Param, Query, Res, UseGuards } from "@nestjs/common";
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
  @Get("/evolutionary-line-of-reading")
  evolutionaryLineOfReading(
    @Query()
    paginationParams: PaginationParams,
    @CurrentUser() user: User,
  ) {
    return this.reportsService.evolutionaryLineOfReading(
      paginationParams,
      user,
    );
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
      user,
    );

    response.setHeader("Content-Type", "text/csv");
    response.header(
      "Content-disposition",
      "attachment; filename=general_synthensis.csv",
    );
    return response.status(200).send("\ufeff" + data);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/evolutionary-line-of-reading/csv")
  async generateCsvForLineOfReading(
    @Query()
    paginationParams: PaginationParams,
    @Res() response: Response,
    @CurrentUser() user: User,
  ) {
    const data = await this.reportsService.generateCsvForLineOfReading(
      paginationParams,
      user,
    );

    response.setHeader("Content-Type", "text/csv");
    response.header(
      "Content-disposition",
      "attachment; filename=evolutionary-line-of-reading.csv",
    );
    return response.status(200).send("\ufeff" + data);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/not-evaluated")
  notEvaluated(
    @CurrentUser() user: User,
    @Query()
    paginationParams: PaginationParams,
  ) {
    return this.reportsService.notEvaluated(paginationParams, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/not-evaluated/csv")
  async generateCsvForNotEvaluated(
    @Query()
    paginationParams: PaginationParams,
    @Res() response: Response,
    @CurrentUser() user: User,
  ) {
    const data = await this.reportsService.generateCsvNotEvaluated(
      paginationParams,
      user,
    );

    response.setHeader("Content-Type", "text/csv");
    response.header(
      "Content-disposition",
      "attachment; filename=not_evaluated.csv",
    );
    return response.status(200).send("\ufeff" + data);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/report-race")
  async reportRace(
    @CurrentUser() user: User,
    @Query()
    paginationParams: PaginationParams,
  ) {
    return await this.reportsService.race(paginationParams, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/report-race/csv")
  async generateCsvForRace(
    @Query()
    paginationParams: PaginationParams,
    @Res() response: Response,
    @CurrentUser() user: User,
  ) {
    const data = await this.reportsService.generateCsvForRace(
      paginationParams,
      user,
    );

    response.setHeader("Content-Type", "text/csv");
    response.header("Content-disposition", "attachment; filename=race.csv");
    return response.status(200).send("\ufeff" + data);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/report-synthetic")
  async reportSynthetic(
    @CurrentUser() user: User,
    @Query()
    paginationParams: PaginationParams,
  ) {
    return await this.reportsService.synthetic(paginationParams, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/report-synthetic/csv")
  async generateCsvForSynthetic(
    @Query()
    paginationParams: PaginationParams,
    @Res() response: Response,
    @CurrentUser() user: User,
  ) {
    const data = await this.reportsService.generateCsvForSynthetic(
      paginationParams,
      user,
    );

    response.setHeader("Content-Type", "text/csv");
    response.header("Content-disposition", "attachment; filename=synthetic.csv");
    return response.status(200).send("\ufeff" + data);
  }
}
