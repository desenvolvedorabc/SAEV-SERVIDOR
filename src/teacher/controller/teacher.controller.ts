import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Put,
  Param,
  Query,
  Res,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Pagination } from "nestjs-typeorm-paginate";
import { PaginationParams } from "../../helpers/params";
import { JwtAuthGuard } from "../../auth/guard/jwt-auth.guard";
import { CreateTeacherDto } from "../model/dto/CreateTeacherDto";
import { UpdateTeacherDto } from "../model/dto/UpdateTeacherDto";
import { Teacher } from "../model/entities/teacher.entity";
import { ITeacher } from "../model/interface/teacher.interface";
import { TeacherService } from "../service/teacher.service";
import { IGender } from "../model/interface/gender.interface.ts";
import { ISkin } from "../model/interface/skin.interface";
import { IFormation } from "../model/interface/formation.interface";
import { User } from "src/user/model/entities/user.entity";
import { CurrentUser } from "src/auth/decorator/current-user.decorator";
import { IdQueryParamDto } from "src/profile/model/dto/IdQueryParamDto";

@Controller("teachers")
@ApiTags("Professor")
export class TeacherController {
  constructor(private teacherService: TeacherService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  add(
    @CurrentUser() user: User,
    @Body() createTeacherDto: CreateTeacherDto,
  ): Promise<ITeacher> {
    return this.teacherService.add(createTeacherDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async paginate(
    @Query() { page, limit, search, order, column, county }: PaginationParams,
  ): Promise<Pagination<Teacher>> {
    limit = Number(limit) > 100 ? 100 : limit;
    column = column ? column : "PRO_NOME";

    return this.teacherService.paginate(
      {
        page: +page,
        limit: +limit,
        route: " ",
      },
      search,
      column,
      order,
      county,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("all/:munId")
  findAll(@Param("munId") munId: number): Promise<ITeacher[]> {
    return this.teacherService.findAll(munId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("one/:munId/:id")
  findOne(@Param("id") id: number, @Param("munId") munId: number) {
    return this.teacherService.findOne(id, munId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(":id")
  update(
    @CurrentUser() user: User,
    @Param() {id}: IdQueryParamDto,
    @Body() updateTeacherDto: UpdateTeacherDto,
  ): Promise<ITeacher> {
    return this.teacherService.update(id, updateTeacherDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("avatar/upload")
  async uploadAvatar(@CurrentUser() user: User, @Body() data: any) {
    const { PRO_ID, filename, base64 } = data;
    return this.teacherService.updateAvatar(+PRO_ID, filename, base64, user);
  }

  @Get("/avatar/:imgpath")
  seeUploadedAvatar(@Param("imgpath") image: string, @Res() res) {
    return res.sendFile(image, { root: "./public/teacher/avatar" });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("gender/all")
  findGenderAll(): Promise<IGender[]> {
    return this.teacherService.findGenderAll();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("skin/all")
  findSkinAll(): Promise<ISkin[]> {
    return this.teacherService.findSkinAll();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("formation/all")
  findFormationAll(): Promise<IFormation[]> {
    return this.teacherService.findFormationAll();
  }
}
