import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  Put,
  Res,
} from "@nestjs/common";
import { SchoolService } from "../service/school.service";
import { CreateSchoolDto } from "../model/dto/create-school.dto";
import { UpdateSchoolDto } from "../model/dto/update-school.dto";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guard/jwt-auth.guard";
import { ISchool } from "../model/interface/school.interface";
import { PaginationParams } from "../../helpers/params";
import { Pagination } from "nestjs-typeorm-paginate";
import { School } from "../model/entities/school.entity";
import { CurrentUser } from "src/auth/decorator/current-user.decorator";
import { User } from "src/user/model/entities/user.entity";
import { IdQueryParamDto } from "src/profile/model/dto/IdQueryParamDto";

@ApiTags("Escola")
@Controller("school")
export class SchoolController {
  constructor(private readonly schoolService: SchoolService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  add(
    @CurrentUser() user: User,
    @Body() createSchoolDto: CreateSchoolDto,
  ): Promise<ISchool> {
    return this.schoolService.add(createSchoolDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/all")
  findAll(@CurrentUser() user: User): Promise<ISchool[]> {
    return this.schoolService.findAll(user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/transfer")
  findByTransfer(@Query() params: PaginationParams, @CurrentUser() user: User) {
    return this.schoolService.findByTransfer(params, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/all/transfer")
  findAllTransfer(): Promise<ISchool[]> {
    return this.schoolService.findAllTransfer();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async paginate(
    @CurrentUser() user: User,
    @Query()
    params: PaginationParams,
  ): Promise<Pagination<School>> {
    return this.schoolService.paginate(params, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/report")
  getSchoolsReport(
    @Query() paginationParams: PaginationParams,
    @CurrentUser() user: User,
  ) {
    return this.schoolService.getSchoolsReport(paginationParams, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(":id/report")
  findOneReport(@Param() { id }: IdQueryParamDto) {
    return this.schoolService.findOneReport(String(id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(":id")
  findOne(@Param() { id }: IdQueryParamDto) {
    return this.schoolService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/county/:id")
  findByCounty(@CurrentUser() user: User, @Param() { id }: IdQueryParamDto) {
    return this.schoolService.findAllByCounty(id, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(":id")
  update(
    @CurrentUser() user: User,
    @Param() { id }: IdQueryParamDto,
    @Body() updateSchoolDto: UpdateSchoolDto,
  ): Promise<ISchool> {
    return this.schoolService.update(id, updateSchoolDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("avatar/upload")
  async uploadAvatar(@CurrentUser() user: User, @Body() data: any) {
    const { ESC_ID, filename, base64 } = data;
    return this.schoolService.updateAvatar(+ESC_ID, filename, base64, user);
  }

  @Get("/avatar/:imgpath")
  seeUploadedAvatar(@Param("imgpath") image: string, @Res() res) {
    return res.sendFile(image, { root: "./public/school/avatar" });
  }
}
