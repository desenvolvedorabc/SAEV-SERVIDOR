import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  Res,
  NotFoundException,
  UseGuards,
  Put,
  Patch,
  Query,
} from "@nestjs/common";
import { AssessmentOnlineService } from "./assessment-online.service";
import { CreateAssessmentOnlineDto } from "./dto/create-assessment-online.dto";
import { UpdateAssessmentOnlineDto } from "./dto/update-assessment-online.dto";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { UploadImageAlternativeDto } from "./dto/upload-image-alternative.dto";
import { unlink } from "node:fs";
import { pngFileFilter } from "src/utils/png-file-filter";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth.guard";
import { CurrentUser } from "src/auth/decorator/current-user.decorator";
import { PaginationParams } from "src/helpers/params";
import { User } from "src/user/model/entities/user.entity";

@ApiTags("Avaliação Online")
@Controller("assessment-online")
export class AssessmentOnlineController {
  constructor(
    private readonly assessmentOnlineService: AssessmentOnlineService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  create(@Body() createAssessmentOnlineDto: CreateAssessmentOnlineDto) {
    return this.assessmentOnlineService.create(createAssessmentOnlineDto);
  }

  @Get("/:id/students")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getStudentsForAssessmentOnline(
    @Param("id") id: string,
    @CurrentUser() user: User,
    @Query() paginationParams: PaginationParams,
  ) {
    return this.assessmentOnlineService.getStudentsForAssessmentOnline(
      +id,
      paginationParams,
      user,
    );
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findOne(@Param("id") id: string) {
    return this.assessmentOnlineService.findOne(+id);
  }

  @Post("/upload")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./public/assessment",
        filename: (req, file, cb) => {
          return cb(null, `${Date.now()}-${file.originalname}`);
        },
      }),
      fileFilter: pngFileFilter,
    }),
  )
  upload(
    @Body() uploadImage: UploadImageAlternativeDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (uploadImage.image) {
      unlink(`./public/assessment/${uploadImage.image}`, (err) => {
        console.log(err);
      });
    }

    return {
      imageUrl: file?.filename,
    };
  }

  @Get("/images/:imgpath")
  getImagePath(@Param("imgpath") image: string, @Res() res) {
    try {
      return res.sendFile(image, { root: "./public/assessment" });
    } catch (err) {
      throw new NotFoundException();
    }
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  update(
    @Param("id") id: string,
    @Body() updateAssessmentOnlineDto: UpdateAssessmentOnlineDto,
  ) {
    return this.assessmentOnlineService.update(+id, updateAssessmentOnlineDto);
  }

  @Patch(":id/toggle-active")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  toggleActive(@Param("id") id: string) {
    return this.assessmentOnlineService.toggleActive(+id);
  }

  @Delete(":id/question")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  deleteQuestion(@Param("id") id: string) {
    return this.assessmentOnlineService.deleteQuestion(+id);
  }

  @Delete(":id/page")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  deletePage(@Param("id") id: string) {
    return this.assessmentOnlineService.deletePage(+id);
  }
}
