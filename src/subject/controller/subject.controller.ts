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
import { SubjectService } from "../service/subject.service";
import { CreateSubjectDto } from "../model/dto/create-subject.dto";
import { UpdateSubjectDto } from "../model/dto/update-subject.dto";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ISubject } from "../model/interface/subject.interface";
import { JwtAuthGuard } from "../../auth/guard/jwt-auth.guard";
import { Pagination } from "nestjs-typeorm-paginate";
import { Subject } from "../model/entities/subject.entity";
import { PaginationParams } from "../../helpers/params";
import { CurrentUser } from "src/auth/decorator/current-user.decorator";
import { User } from "src/user/model/entities/user.entity";
import { IdQueryParamDto } from "src/profile/model/dto/IdQueryParamDto";

@ApiTags("Disciplina")
@Controller("subject")
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  add(
    @CurrentUser() user: User,
    @Body() createSubjectDto: CreateSubjectDto,
  ): Promise<ISubject> {
    return this.subjectService.add(createSubjectDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/all")
  findAll(): Promise<ISubject[]> {
    return this.subjectService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async paginate(
    @Query() { page, limit, search, order, status, column }: PaginationParams,
  ): Promise<Pagination<Subject>> {
    limit = Number(limit) > 100 ? 100 : limit;
    return this.subjectService.paginate(
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
    return this.subjectService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(":id")
  update(
    @CurrentUser() user: User,
    @Param() {id}: IdQueryParamDto,
    @Body() updateSubjectDto: UpdateSubjectDto,
  ): Promise<ISubject> {
    return this.subjectService.update(id, updateSubjectDto, user);
  }
}
