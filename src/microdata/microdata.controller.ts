import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Res,
} from "@nestjs/common";
import { MicrodataService } from "./microdata.service";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PaginationMicroDataDto } from "./dto/pagination-microdata.dto";
import { CurrentUser } from "src/auth/decorator/current-user.decorator";
import { User } from "src/user/model/entities/user.entity";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth.guard";
import { PaginationParams } from "src/helpers/params";
import { createReadStream } from "node:fs";
import { join } from "node:path";

@ApiTags("Microdados")
@Controller("microdata")
export class MicrodataController {
  constructor(private readonly microdataService: MicrodataService) {}


  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  findAll(@Query() params: PaginationParams, @CurrentUser() user: User) {
    return this.microdataService.findAll(params, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("export-infrequency")
  exportInfrequency(
    @Query() params: PaginationMicroDataDto,
    @CurrentUser() user: User,
  ) {
    this.microdataService.exportInfrequencyData(params, user);
    return;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("export-students")
  exportStudents(
    @Query() params: PaginationMicroDataDto,
    @CurrentUser() user: User,
  ) {
    this.microdataService.exportStudentsData(params, user);
    return;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("export-evaluation-data")
  exportEvaluationData(
    @Query() params: PaginationMicroDataDto,
    @CurrentUser() user: User,
  ) {
    this.microdataService.exportEvaluationData(params, user);
    return;
  }

  @Get("/file/:filepath")
  seeUploadedFile(@Param("filepath") file: string, @Res() res) {
    const fileRead = createReadStream(
      join(process.cwd(), "public", "microdata", file),
    );

    res.setHeader('Content-Disposition', `attachment; filename=${file}`);
    res.setHeader("Content-Type", "application/zip");
    fileRead.pipe(res);
  }
}
