import {
  Controller,
  Get,
  UseGuards,
  Query,
  Put,
  Param,
  Body,
  Post,
} from "@nestjs/common";
import { AssessmentsService } from "../service/assessment.service";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guard/jwt-auth.guard";
import { Pagination } from "nestjs-typeorm-paginate";
import { PaginationParams } from "../../helpers/params";
import { Assessment } from "../model/entities/assessment.entity";
import { CreateAssessmentDto } from "../model/dto/create-assessment.dto";
import { UpdateAssessmentDto } from "../model/dto/update-assessment.dto";
import { ChangeValuationDateDTO } from "../model/dto/change-valuation-date.dto";
import { CurrentUser } from "src/auth/decorator/current-user.decorator";
import { User } from "src/user/model/entities/user.entity";
import { IdQueryParamDto } from "src/profile/model/dto/IdQueryParamDto";

@ApiTags("Avaliação")
@Controller("assessments")
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  add(
    @CurrentUser() user: User,
    @Body() createAssessmentDto: CreateAssessmentDto,
  ): Promise<Assessment> {
    return this.assessmentsService.add(createAssessmentDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(":id")
  update(
    @CurrentUser() user: User,
    @Param() { id }: IdQueryParamDto,
    @Body() updateAssessmentDto: UpdateAssessmentDto,
  ): Promise<Assessment> {
    return this.assessmentsService.update(id, updateAssessmentDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/years/:ano")
  findYears(
    @Param("ano") ano: string,
    @CurrentUser() user: User,
  ): Promise<Assessment[]> {
    return this.assessmentsService.findYears(ano, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/years")
  findAllYears(): Promise<Assessment[]> {
    return this.assessmentsService.findAllYears();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/release-results")
  findByReleaseResults(@Query() paginationParams: PaginationParams) {
    return this.assessmentsService.findByReleaseResults(paginationParams);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(":id")
  findOne(@Param() { id }: IdQueryParamDto) {
    return this.assessmentsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async paginate(
    @Query() params: PaginationParams,
  ): Promise<Pagination<Assessment>> {
    return this.assessmentsService.paginate(params);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put("/change-valuation-date/:id")
  changeValuationDate(
    @CurrentUser() user: User,
    @Param() { id }: IdQueryParamDto,
    @Body() dto: ChangeValuationDateDTO,
  ) {
    return this.assessmentsService.changeValuationDate(dto, id, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/tests/download")
  getTestsByFilter(@Query() paginationParams: PaginationParams) {
    return this.assessmentsService.getTestsByFilter(paginationParams);
  }
}
