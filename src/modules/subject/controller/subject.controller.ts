import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Pagination } from 'nestjs-typeorm-paginate'
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator'
import { QueryIdParamDto } from 'src/modules/profile/model/dto/QueryIdParamDto'
import { User } from 'src/modules/user/model/entities/user.entity'

import { PaginationParams } from '../../../helpers/params'
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard'
import { CreateSubjectDto } from '../model/dto/create-subject.dto'
import { UpdateSubjectDto } from '../model/dto/update-subject.dto'
import { Subject } from '../model/entities/subject.entity'
import { ISubject } from '../model/interface/subject.interface'
import { SubjectService } from '../service/subject.service'

@ApiTags('Disciplina')
@Controller('subject')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  add(
    @CurrentUser() user: User,
    @Body() createSubjectDto: CreateSubjectDto,
  ): Promise<ISubject> {
    return this.subjectService.add(createSubjectDto, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/all')
  findAll(): Promise<ISubject[]> {
    return this.subjectService.findAll()
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async paginate(
    @Query() { page, limit, search, order, status, column }: PaginationParams,
  ): Promise<Pagination<Subject>> {
    limit = Number(limit) > 100 ? 100 : limit
    return this.subjectService.paginate(
      {
        page: +page,
        limit: +limit,
        route: ' ',
      },
      search,
      column,
      order,
      status,
    )
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  findOne(@Param() { id }: QueryIdParamDto) {
    return this.subjectService.findOne(id)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(':id')
  update(
    @CurrentUser() user: User,
    @Param() { id }: QueryIdParamDto,
    @Body() updateSubjectDto: UpdateSubjectDto,
  ): Promise<ISubject> {
    return this.subjectService.update(id, updateSubjectDto, user)
  }
}
