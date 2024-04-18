import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  Put,
} from "@nestjs/common";
import { SerieService } from "../service/serie.service";
import { CreateSerieDto } from "../model/dto/create-serie.dto";
import { UpdateSerieDto } from "../model/dto/update-serie.dto";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ISerie } from "../model/interface/serie.interface";
import { JwtAuthGuard } from "../../auth/guard/jwt-auth.guard";
import { PaginationParams } from "../../helpers/params";
import { User } from "src/user/model/entities/user.entity";
import { CurrentUser } from "src/auth/decorator/current-user.decorator";
import { IdQueryParamDto } from "src/profile/model/dto/IdQueryParamDto";

@ApiTags("Série")
@Controller("serie")
export class SerieController {
  constructor(private readonly serieService: SerieService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  add(
    @CurrentUser() user: User,
    @Body() createSerieDto: CreateSerieDto,
  ): Promise<ISerie> {
    return this.serieService.add(createSerieDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/all")
  findAll(): Promise<ISerie[]> {
    return this.serieService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async paginate(
    @Query()
    { page, limit, search, order, status, column, school, active }: PaginationParams,
  ) {
    limit = Number(limit) > 100 ? 100 : limit;
    return this.serieService.paginate(
      {
        page: +page,
        limit: +limit,
        route: " ",
      },
      search,
      column,
      order,
      status,
      school,
      active
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(":id")
  findOne(@Param() {id}: IdQueryParamDto) {
    return this.serieService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/reports/:id")
  findOneReports(@Param() {id}: IdQueryParamDto) {
    return this.serieService.findOneReports(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(":id")
  update(
    @CurrentUser() user: User,
    @Param() {id}: IdQueryParamDto,
    @Body() updateSerieDto: UpdateSerieDto,
  ): Promise<ISerie> {
    return this.serieService.update(id, updateSerieDto, user);
  }
}
