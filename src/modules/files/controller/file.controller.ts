import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { createReadStream } from 'fs'
import { diskStorage } from 'multer'
import { join } from 'path'
import { PaginationParams } from 'src/helpers/params'
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator'
import { User } from 'src/modules/user/model/entities/user.entity'

import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard'
import { ImportResultStudentsDto } from '../model/dto/import-result-students.dto'
import { FileService } from '../service/file.service'

@Controller('files')
@ApiTags('Arquivo de Template')
export class FileController {
  constructor(private fileService: FileService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('/users')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './public/file',
        filename: (req, file, cb) => {
          return cb(null, `${Date.now()}-${file.originalname}`)
        },
      }),
    }),
  )
  importUsers(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.fileService.importUsers(file, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('/students')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './public/file',
        filename: (req, file, cb) => {
          return cb(null, `${Date.now()}-${file.originalname}`)
        },
      }),
    }),
  )
  importStudents(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.fileService.newImportStudents(file, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('/release-result-students')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './public/file',
        filename: (req, file, cb) => {
          return cb(null, `${Date.now()}-${file.originalname}`)
        },
      }),
    }),
  )
  releaseResultsStudents(
    @Body() dto: ImportResultStudentsDto,
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.fileService.releaseResultStudents(file, dto, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  paginate(@Query() params: PaginationParams) {
    return this.fileService.paginate(params)
  }

  @Get('/file/:filepath')
  seeUploadedFile(@Param('filepath') file: string, @Res() res) {
    const fileRead = createReadStream(
      join(process.cwd(), 'public', 'file', file),
    )

    res.setHeader('Content-Type', 'text/csv')

    fileRead.pipe(res)
  }
}
