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
import { Body } from "@nestjs/common";

@Controller("files")
@ApiTags("Arquivo de Template")
export class FileController {
  constructor(private fileService: FileService) {}

  @Post("/temp-import")
  async tempImport(@Body() dto: any) {
    return this.fileService.tempImport(dto.filename);
  }

  // @Get("/teste")
  // async teste() {
  //   return this.fileService.testeNewImport()
  // }


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
    this.fileService.testeNewImport(file, user);
    return;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  pagiante(@Query() params: PaginationParams) {
    return this.fileService.paginate(params);
  }

  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  // @Get(":id")
  // findOne(@Param("id") id: number) {
  //   return this.fileService.findOne(id);
  // }

  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  // @Post("file/upload")
  // async uploadFile(@Body() data: any) {
  //   const { ARQ_ID, filename, base64 } = data;
  //   return this.fileService.updateFile(ARQ_ID, filename, base64);
  // }

  @Get("/file/:filepath")
  seeUploadedFile(@Param("filepath") file: string, @Res() res) {
    const fileRead = createReadStream(
      join(process.cwd(), "public", "file", file),
    );

    res.setHeader("Content-Type", "text/csv");
    // res.header(
    //   "Content-disposition",
    //   "attachment; filename=general_synthensis.csv",
    // );
    fileRead.pipe(res);
  }

  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  // @Get("/data/all")
  // paginate(
  //   @Query() { page, limit, search, order, column }: PaginationParams,
  // ): Promise<Pagination<Data>> {
  //   limit = Number(limit) > 100 ? 100 : limit;
  //   return this.fileService.paginate(
  //     {
  //       page: +page,
  //       limit: +limit,
  //       route: " ",
  //     },
  //     search,
  //     column,
  //     order,
  //   );
  // }
}
