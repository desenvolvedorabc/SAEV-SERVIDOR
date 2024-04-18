import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Put,
  Request,
  Param,
  Query,
  Res,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Pagination } from "nestjs-typeorm-paginate";
import { PaginationParams } from "../../helpers/params";
import { JwtAuthGuard } from "../../auth/guard/jwt-auth.guard";
import { CreateUserDto } from "../model/dto/CreateUserDto";
import { UpdateUserDto } from "../model/dto/UpdateUserDto";
import { User } from "../model/entities/user.entity";
import { IUser } from "../model/interface/user.interface";
import { UserService } from "../service/user.service";
import { CurrentUser } from "src/auth/decorator/current-user.decorator";
import { IdQueryParamDto } from "src/profile/model/dto/IdQueryParamDto";

@Controller("users")
@ApiTags("Usuário")
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  add(
    @CurrentUser() user: User,
    @Body() createUserDto: CreateUserDto,
  ): Promise<IUser> {
    return this.userService.add(createUserDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/all")
  findAll(): Promise<IUser[]> {
    return this.userService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async paginate(
    @Request() req: { user: User },
    @Query()
    paginationParams: PaginationParams,
  ): Promise<Pagination<User>> {
    const { page, limit } = paginationParams;

    return this.userService.paginate(
      {
        page: +page,
        limit: +Number(limit) > 100 ? "100" : limit,
        route: " ",
      },
      paginationParams,
      req.user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(":id")
  findOne(@Param() {id}: IdQueryParamDto) {
    return this.userService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("/welcome-reset-password/:id")
  welcomePasswordChangeLink(@Param() {id}: IdQueryParamDto) {
    return this.userService.welcomePasswordChangeLink(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(":id")
  update(
    @CurrentUser() user: User,
    @Param() {id}: IdQueryParamDto,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<IUser> {
    return this.userService.updateUser(id, updateUserDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("avatar/upload")
  async uploadAvatar(@CurrentUser() user: User, @Body() data: any) {
    const { USU_ID, filename, base64 } = data;
    return this.userService.updateAvatar(+USU_ID, filename, base64, user);
  }

  @Get("/avatar/:imgpath")
  seeUploadedAvatar(@Param("imgpath") image: string, @Res() res) {
    return res.sendFile(image, { root: "./public/user/avatar" });
  }
}
