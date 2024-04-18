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
import { StudentService } from "../service/student.service";
import { CreateStudentDto } from "../model/dto/create-student.dto";
import { UpdateStudentDto } from "../model/dto/update-student.dto";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guard/jwt-auth.guard";
import { IStudent } from "../model/interface/student.interface";
import { PaginationParams } from "../../helpers/params";
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
  @Get("/names")
  async getStudents(
    @CurrentUser() user: User,
    @Query()
    paginationParams: PaginationParams,
  ) {
    return this.studentService.getStudentsNames(paginationParams, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async paginate(@CurrentUser() user: User, @Query() params: PaginationParams) {
    return this.studentService.paginate(params, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/with-not-grouped")
  async paginateWithTotalNotGrouped(
    @CurrentUser() user: User,
    @Query() params: PaginationParams,
  ) {
    return this.studentService.paginateWithTotalNotGrouped(params, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/transfer")
  async getByTransfer(
    @CurrentUser() user: User,
    @Query() params: PaginationParams,
  ) {
    return this.studentService.getByTransfer(params, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/generate-csv")
  async generateCsv(
    @Query()
    params: PaginationParams,
    @CurrentUser() user: User,
    @Res() res,
  ) {
    const csv = await this.studentService.generateCsv(params, user);

    const nameFile = `${Date.now()}-alunos.csv`;
    res.setHeader("Content-Disposition", `attachment; filename=${nameFile}`);
    res.send(csv);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(":id")
  findOne(@Param() { id }: IdQueryParamDto) {
    return this.studentService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/reports/:id")
  findOneReports(@Param() { id }: IdQueryParamDto) {
    return this.studentService.findOneReports(String(id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/evaluation-history/:id")
  evaluationHistory(
    @Param() { id }: IdQueryParamDto,
    @Query() paginateParams: PaginationParams,
  ) {
    return this.studentService.evaluationHistory(paginateParams, String(id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/school/:id")
  findBySchool(@Param() { id }: IdQueryParamDto) {
    return this.studentService.findBySchool(String(id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(":id")
  update(
    @CurrentUser() user: User,
    @Param() { id }: IdQueryParamDto,
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
