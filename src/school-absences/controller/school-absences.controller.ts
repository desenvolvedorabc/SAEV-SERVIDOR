import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
  Delete,
} from "@nestjs/common";
import { SchoolAbsencesService } from "../service/school-absences.service";
import { CreateSchoolAbsencesDto } from "../model/dto/create-school-absences.dto";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guard/jwt-auth.guard";
import { Pagination } from "nestjs-typeorm-paginate";
import { PaginationParams } from "../../helpers/params";
import { User } from "src/user/model/entities/user.entity";
import { CurrentUser } from "src/auth/decorator/current-user.decorator";

@ApiTags("Infrequência")
@Controller("school-absences")
export class SchoolAbsencesController {
  constructor(private readonly schoolAbsencesService: SchoolAbsencesService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  save(
    @CurrentUser() user: User,
    @Body() createSchoolAbsencesDto: CreateSchoolAbsencesDto[],
  ) {
    return this.schoolAbsencesService.save(createSchoolAbsencesDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete()
  remove(@Body() createSchoolAbsencesDto: CreateSchoolAbsencesDto[]) {
    return this.schoolAbsencesService.delete(createSchoolAbsencesDto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async paginate(
    @Query()
    {
      page,
      limit,
      search,
      order,
      column,
      schoolClass,
      month,
      year,
    }: PaginationParams,
  ): Promise<Pagination<any>> {
    limit = Number(limit) > 100 ? 100 : limit;
    return this.schoolAbsencesService.paginate(
      {
        page: +page,
        limit: +limit,
        route: " ",
      },
      search,
      column,
      order,
      schoolClass,
      month,
      year,
    );
  }
}
