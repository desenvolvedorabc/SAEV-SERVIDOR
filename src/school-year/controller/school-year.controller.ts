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
import { SchoolYearService } from "../service/school-year.service";
import { CreateSchoolYearDto } from "../model/dto/create-school-year.dto";
import { UpdateSchoolYearDto } from "../model/dto/update-school-year.dto";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ISchoolYear } from "../model/interface/school-year.interface";
import { JwtAuthGuard } from "../../auth/guard/jwt-auth.guard";
import { Pagination } from "nestjs-typeorm-paginate";
import { SchoolYear } from "../model/entities/school-year.entity";
import { PaginationParams } from "../../helpers/params";
import { User } from "src/user/model/entities/user.entity";
import { CurrentUser } from "src/auth/decorator/current-user.decorator";
import { IdQueryParamDto } from "src/profile/model/dto/IdQueryParamDto";

@ApiTags("Ano Letivo")
@Controller("school-year")
export class SchoolYearController {
  constructor(private readonly schoolYearService: SchoolYearService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  add(
    @CurrentUser() user: User,
    @Body() createSchoolYearDto: CreateSchoolYearDto,
  ): Promise<ISchoolYear> {
    return this.schoolYearService.add(createSchoolYearDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/all")
  findAll(): Promise<ISchoolYear[]> {
    return this.schoolYearService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async paginate(
    @Query() { page, limit, search, order, status, column }: PaginationParams,
  ): Promise<Pagination<SchoolYear>> {
    limit = Number(limit) > 100 ? 100 : limit;
    return this.schoolYearService.paginate(
      {
        page: +page,
        limit: +limit,
        route: " ",
      },
      search,
      column,
      order,
      status,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(":id")
  findOne(@Param() {id}: IdQueryParamDto) {
    return this.schoolYearService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(":id")
  update(
    @CurrentUser() user: User,
    @Param() {id}: IdQueryParamDto,
    @Body() updateSchoolYearDto: UpdateSchoolYearDto,
  ): Promise<ISchoolYear> {
    return this.schoolYearService.update(id, updateSchoolYearDto, user);
  }
}
