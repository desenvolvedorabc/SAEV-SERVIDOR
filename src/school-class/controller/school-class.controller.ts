import {
  Controller,
  Get,
  UseGuards,
  Param,
  Put,
  Body,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "src/auth/decorator/current-user.decorator";
import { PaginationParams } from "src/helpers/params";
import { IdQueryParamDto } from "src/profile/model/dto/IdQueryParamDto";
import { User } from "src/user/model/entities/user.entity";
import { JwtAuthGuard } from "../../auth/guard/jwt-auth.guard";
import { CreateSchoolClassDto } from "../model/dto/create-school-class.dto";
import { UpdateSchoolClassDto } from "../model/dto/update-school-class.dto";
import { SchoolClass } from "../model/entities/school-class.entity";
import { SchoolClassService } from "../service/school-class.service";

@ApiTags("Turmas")
@Controller("school-class")
export class SchoolClassController {
  constructor(private schoolClassService: SchoolClassService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async paginate(
    @CurrentUser() user: User,
    @Query()
    {
      page,
      limit,
      search,
      order,
      column,
      type,
      year,
      county,
      school,
      status,
      active,
      serie
    }: PaginationParams,
  ): Promise<any> {
    limit = Number(limit) > 100 ? 100 : limit;
    return this.schoolClassService.paginate(
      {
        page: +page,
        limit: +limit,
        route: " ",
      },
      search,
      column,
      order,
      year,
      county,
      school,
      type,
      status,
      user,
      Number(serie),
      active,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/all")
  findAll(): Promise<SchoolClass[]> {
    return this.schoolClassService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(":id")
  findOne(@Param() {id}: IdQueryParamDto) {
    return this.schoolClassService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/school/:idSchool")
  findSerieBySchool(@Param("idSchool") idSchool: string) {
    return this.schoolClassService.findSerieBySchool(idSchool);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/school/:idSchool/serie/:idSerie")
  findBySchool(
    @Param("idSchool") idSchool: string,
    @Param("idSerie") idSerie: string,
    @Query() params: PaginationParams
  ) {
    return this.schoolClassService.findBySchoolAndSerie(idSchool, idSerie, params);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  add(
    @CurrentUser() user: User,
    @Body() createSchoolClassDto: CreateSchoolClassDto,
  ): Promise<SchoolClass> {
    return this.schoolClassService.add(createSchoolClassDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(":id")
  update(
    @CurrentUser() user: User,
    @Param() {id}: IdQueryParamDto,
    @Body() updateSchoolClassDto: UpdateSchoolClassDto,
  ): Promise<SchoolClass> {
    return this.schoolClassService.update(id, updateSchoolClassDto, user);
  }
}
