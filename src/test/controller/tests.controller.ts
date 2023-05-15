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
import { TestsService } from "../service/tests.service";
import { CreateTestDto } from "../model/dto/create-test.dto";
import { UpdateTestDto } from "../model/dto/update-tests.dto";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guard/jwt-auth.guard";
import { Pagination } from "nestjs-typeorm-paginate";
import { Test } from "../model/entities/test.entity";
import { PaginationParams } from "../../helpers/params";
import { User } from "src/user/model/entities/user.entity";
import { CurrentUser } from "src/auth/decorator/current-user.decorator";
import { GetTestHerby } from "../model/dto/get-test-herby";

// campo tur anexo

@ApiTags("Testes")
@Controller("tests")
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  add(
    @CurrentUser() user: User,
    @Body() createTestDto: CreateTestDto,
  ): Promise<Test> {
    return this.testsService.add(createTestDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/all")
  findAll(): Promise<Test[]> {
    return this.testsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/years/:ano")
  findYears(@Param("ano") ano: string): Promise<Test[]> {
    return this.testsService.findYears(ano);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/years")
  getYears(): Promise<Test[]> {
    return this.testsService.findAllYears();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async paginate(
    @Query() { page, limit, search, order, column }: PaginationParams,
  ): Promise<Pagination<Test>> {
    limit = Number(limit) > 100 ? 100 : limit;
    return this.testsService.paginate(
      {
        page: +page,
        limit: +limit,
        route: " ",
      },
      search,
      column,
      order,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(":id")
  async findOne(@Param("id") id: number) {
    return this.testsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(":id/herby")
  async findTestByHerby(@Param("id") id: number, @Query() getTestHerby: GetTestHerby) {
    return this.testsService.findOneByHerby(id, getTestHerby);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(":id")
  update(
    @CurrentUser() user: User,
    @Param("id") id: number,
    @Body() updateTestDto: UpdateTestDto,
  ): Promise<Test> {
    return this.testsService.update(id, updateTestDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("file/upload")
  async uploadFile(@CurrentUser() user: User, @Body() data: any) {
    const { TES_ID, filename, base64 } = data;
    return this.testsService.updateFile(+TES_ID, filename, base64, user);
  }

  @Get("/file/:imgpath")
  seeUploadedFile(@Param("imgpath") image: string, @Res() res) {
    return res.sendFile(image, { root: "./public/test/file" });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("manual/upload")
  async uploadAvatar(@CurrentUser() user: User, @Body() data: any) {
    const { TES_ID, filename, base64 } = data;
    return this.testsService.updateManual(+TES_ID, filename, base64, user);
  }

  @Get("/manual/:imgpath")
  seeUploadedAvatar(@Param("imgpath") image: string, @Res() res) {
    return res.sendFile(image, { root: "./public/test/manual" });
  }
}
