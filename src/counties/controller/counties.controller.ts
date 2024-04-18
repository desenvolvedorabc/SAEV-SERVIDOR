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
import { CountiesService } from "../service/counties.service";
import { CreateCountyDto } from "../model/dto/create-county.dto";
import { UpdateCountyDto } from "../model/dto/update-county.dto";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ICounty } from "../model/interface/county.interface";
import { JwtAuthGuard } from "../../auth/guard/jwt-auth.guard";
import { Pagination } from "nestjs-typeorm-paginate";
import { County } from "../model/entities/county.entity";
import { PaginationParams } from "../../helpers/params";
import { CurrentUser } from "src/auth/decorator/current-user.decorator";
import { User } from "src/user/model/entities/user.entity";
import { IdQueryParamDto } from "src/profile/model/dto/IdQueryParamDto";

@ApiTags("Município")
@Controller("counties")
export class CountiesController {
  constructor(private readonly countiesService: CountiesService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  add(
    @CurrentUser() user: User,
    @Body() createCountyDto: CreateCountyDto,
  ): Promise<ICounty> {
    return this.countiesService.add(createCountyDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/all")
  findAll(@CurrentUser() user: User): Promise<ICounty[]> {
    return this.countiesService.findAll(user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  paginate(
    @CurrentUser() user: User,
    @Query() params: PaginationParams,
  ): Promise<Pagination<County>> {
    return this.countiesService.paginate(params, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/report")
  getCountiesReport(
    @Query() paginateParams: PaginationParams,
    @CurrentUser() user: User,
  ) {
    return this.countiesService.getCountiesReport(paginateParams, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(":id/report")
  findOneReport(@Param() { id }: IdQueryParamDto) {
    return this.countiesService.findOneReport(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(":id")
  findOne(@Param() { id }: IdQueryParamDto) {
    return this.countiesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(":id")
  update(
    @CurrentUser() user: User,
    @Param() { id }: IdQueryParamDto,
    @Body() updateCountyDto: UpdateCountyDto,
  ): Promise<ICounty> {
    return this.countiesService.update(id, updateCountyDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/districts/:uf")
  trictfindDistrict(
    @Param("uf") uf: string,
    @CurrentUser() user: User,
  ): Promise<County[]> {
    if (uf === "all") return this.countiesService.findAllDistrict();
    return this.countiesService.findDistrict(uf, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("avatar/upload")
  async uploadAvatar(@CurrentUser() user: User, @Body() data: any) {
    const { MUN_ID, filename, base64 } = data;
    return this.countiesService.updateAvatar(MUN_ID, filename, base64, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("file/upload")
  async uploadFile(@CurrentUser() user: User, @Body() data: any) {
    const { MUN_ID, filename, base64 } = data;
    return this.countiesService.updateFile(+MUN_ID, filename, base64, user);
  }

  @Get("/avatar/:imgpath")
  seeUploadedAvatar(@Param("imgpath") image: string, @Res() res) {
    return res.sendFile(image, { root: "./public/county/avatar" });
  }

  @Get("/file/:filepath")
  seeUploadedFile(@Param("filepath") image: string, @Res() res) {
    return res.sendFile(image, { root: "./public/county/file" });
  }
}
