import {
  Controller,
  Get,
  UseGuards,
  Param,
  Post,
  Res,
  Query,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { createReadStream } from "fs";
import { join } from "path";
import { PaginationParams } from "src/helpers/params";
import { JwtAuthGuard } from "../../auth/guard/jwt-auth.guard";
import { FileService } from "../service/file.service";
import { diskStorage } from "multer";
import { CurrentUser } from "src/auth/decorator/current-user.decorator";
import { User } from "src/user/model/entities/user.entity";

@Controller("files")
@ApiTags("Arquivo de Template")
export class FileController {
  constructor(private fileService: FileService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("/users")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./public/file",
        filename: (req, file, cb) => {
          return cb(null, `${Date.now()}-${file.originalname}`);
        },
      }),
    }),
  )
  importUsers(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    this.fileService.importUsers(file, user);
    return;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("/students")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./public/file",
        filename: (req, file, cb) => {
          return cb(null, `${Date.now()}-${file.originalname}`);
        },
      }),
    }),
  )
  importStudents(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    this.fileService.newImportStudents(file, user);
    return;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  paginate(@Query() params: PaginationParams) {
    return this.fileService.paginate(params);
  }

  @Get("/file/:filepath")
  seeUploadedFile(@Param("filepath") file: string, @Res() res) {
    const fileRead = createReadStream(
      join(process.cwd(), "public", "file", file),
    );

    res.setHeader("Content-Type", "text/csv");

    fileRead.pipe(res);
  }
}
