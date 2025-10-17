import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator'
import { QueryIdParamDto } from 'src/modules/profile/model/dto/QueryIdParamDto'
import { User } from 'src/modules/user/model/entities/user.entity'

import { PaginationParams } from '../../../helpers/params'
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard'
import { CreateStudentDto } from '../model/dto/create-student.dto'
import { GroupStudentDto } from '../model/dto/group-student.dto'
import { UpdateStudentDto } from '../model/dto/update-student.dto'
import { IStudent } from '../model/interface/student.interface'
import { StudentService } from '../service/student.service'

@ApiTags('Aluno')
@Controller('student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  add(
    @CurrentUser() user: User,
    @Body() createStudentDto: CreateStudentDto,
  ): Promise<IStudent> {
    return this.studentService.add(createStudentDto, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/names')
  async getStudents(
    @CurrentUser() user: User,
    @Query()
    paginationParams: PaginationParams,
  ) {
    return this.studentService.getStudentsNames(paginationParams, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async paginate(@CurrentUser() user: User, @Query() params: PaginationParams) {
    return this.studentService.paginate(params, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/with-not-grouped')
  async paginateWithTotalNotGrouped(
    @CurrentUser() user: User,
    @Query() params: PaginationParams,
  ) {
    return this.studentService.paginateWithTotalNotGrouped(params, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/transfer')
  async getByTransfer(
    @CurrentUser() user: User,
    @Query() params: PaginationParams,
  ) {
    return this.studentService.getByTransfer(params, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/generate-csv')
  async generateCsv(
    @Query()
    params: PaginationParams,
    @CurrentUser() user: User,
    @Res() res,
  ) {
    const csv = await this.studentService.generateCsv(params, user)

    const nameFile = `${Date.now()}-alunos.csv`
    res.setHeader('Content-Disposition', `attachment; filename=${nameFile}`)
    res.send(csv)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  findOne(@Param() { id }: QueryIdParamDto) {
    return this.studentService.findOne(id)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/reports/:id')
  findOneReports(@Param() { id }: QueryIdParamDto) {
    return this.studentService.findOneReports(String(id))
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/evaluation-history/:id')
  evaluationHistory(
    @Param() { id }: QueryIdParamDto,
    @Query() paginateParams: PaginationParams,
  ) {
    return this.studentService.evaluationHistory(paginateParams, String(id))
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/school/:id')
  findBySchool(@Param() { id }: QueryIdParamDto) {
    return this.studentService.findBySchool(String(id))
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put('/:id')
  update(
    @CurrentUser() user: User,
    @Param() { id }: QueryIdParamDto,
    @Body() updateStudentDto: UpdateStudentDto,
  ): Promise<IStudent> {
    return this.studentService.updateWithValidate(id, updateStudentDto, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('avatar/upload')
  async uploadAvatar(@CurrentUser() user: User, @Body() data: any) {
    const { ALU_ID, filename, base64 } = data
    return this.studentService.updateAvatar(+ALU_ID, filename, base64, user)
  }

  @Get('/avatar/:imgpath')
  seeUploadedAvatar(@Param('imgpath') image: string, @Res() res) {
    return res.sendFile(image, { root: './public/student/avatar' })
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/pcd/all')
  findAllPcd() {
    return this.studentService.findAllPcd()
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('group-student')
  groupStudent(@Body() dto: GroupStudentDto, @CurrentUser() user: User) {
    return this.studentService.groupStudent(dto, user)
  }
}
