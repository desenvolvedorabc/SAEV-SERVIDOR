import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  Param,
  UseGuards,
  Query,
  Put,
  Res,
} from "@nestjs/common";
import { StudentService } from "../service/student.service";
import { CreateStudentDto } from "../model/dto/create-student.dto";
import { UpdateStudentDto } from "../model/dto/update-student.dto";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guard/jwt-auth.guard";
import { IStudent } from "../model/interface/student.interface";
import { PaginationParams } from "../../helpers/params";
import { Pagination } from "nestjs-typeorm-paginate";
import { Student } from "../model/entities/student.entity";
import { GroupStudentDto } from "../model/dto/group-student.dto";
import { User } from "src/user/model/entities/user.entity";
import { CurrentUser } from "src/auth/decorator/current-user.decorator";
import { IdQueryParamDto } from "src/profile/model/dto/IdQueryParamDto";

@ApiTags("Aluno")
@Controller("student")
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  add(
    @CurrentUser() user: User,
    @Body() createStudentDto: CreateStudentDto,
  ): Promise<IStudent> {
    return this.studentService.add(createStudentDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/all")
  findAll(): Promise<IStudent[]> {
    return this.studentService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("names")
  async getStudents(
    @Request() req: { user: User },
    @Query()
    paginatioParams: PaginationParams,
  ) {
    return this.studentService.getStudents(paginatioParams, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async paginate(
    @Request() req: { user: User },
    @Query()
    {
      page,
      limit,
      search,
      order,
      status,
      column,
      county,
      school,
      serie,
      active,
    }: PaginationParams,
  ) {
    limit = Number(limit) > 100 ? 100 : limit;
    return this.studentService.paginate(
      {
        page: +page,
        limit: +limit,
        route: " ",
      },
      search,
      column,
      order,
      status,
      county,
      school,
      parseInt(serie),
      active,
      req.user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/transfer')
  async getByTransfer(
    @Request() req: { user: User },
    @Query()
    {
      page,
      limit,
      search,
      order,
      status,
      column,
      county,
      school,
      serie,
      active,
    }: PaginationParams,
  ) {
    limit = Number(limit) > 100 ? 100 : limit;
    return this.studentService.getByTransfer(
      {
        page: +page,
        limit: +limit,
        route: " ",
      },
      search,
      column,
      order,
      status,
      county,
      school,
      parseInt(serie),
      active,
      req.user,
    );
  }

  @Get("names")
  async findStudentsByNamePaginated() {
    return this.studentService.findStudentsByNamePaginated();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/profile")
  async paginateByProfile(
    @Query()
    {
      page,
      limit,
      search,
      order,
      status,
      column,
      county,
      school,
      serie,
    }: PaginationParams,
    @Request() req: { user: User },
  ): Promise<Pagination<Student>> {
    limit = Number(limit) > 100 ? 100 : limit;
    return this.studentService.paginateByProfile(
      {
        page: +page,
        limit: +limit,
        route: " ",
      },
      search,
      column,
      order,
      status,
      county,
      school,
      parseInt(serie),
      req.user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(":id")
  findOne(@Param() {id}: IdQueryParamDto) {
    return this.studentService.findOne(id);
  }

  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  @Get("/desagrupar/students")
  desagrupar() {
    return this.studentService.groupedStudents();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/reports/:id")
  findOneReports(@Param() {id}: IdQueryParamDto) {
    return this.studentService.findOneReports(String(id));
  }

  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  @Get("/evaluation-history/:id")
  evaluationHistory(
    @Param() {id}: IdQueryParamDto,
    @Query() paginateParams: PaginationParams,
  ) {
    return this.studentService.evaluationHistory(paginateParams, String(id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/school/:id")
  findBySchool(@Param() {id}: IdQueryParamDto) {
    return this.studentService.findBySchool(String(id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(":id")
  update(
    @CurrentUser() user: User,
    @Param() {id}: IdQueryParamDto,
    @Body() updateStudentDto: UpdateStudentDto,
  ): Promise<IStudent> {
    return this.studentService.updateWithValidate(id, updateStudentDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("avatar/upload")
  async uploadAvatar(@CurrentUser() user: User, @Body() data: any) {
    const { ALU_ID, filename, base64 } = data;
    return this.studentService.updateAvatar(+ALU_ID, filename, base64, user);
  }

  @Get("/avatar/:imgpath")
  seeUploadedAvatar(@Param("imgpath") image: string, @Res() res) {
    return res.sendFile(image, { root: "./public/student/avatar" });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/pcd/all")
  findAllPcd() {
    return this.studentService.findAllPcd();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("group-student")
  groupStudent(@Body() dto: GroupStudentDto, @CurrentUser() user: User) {
    return this.studentService.groupStudent(dto, user);
  }
}
