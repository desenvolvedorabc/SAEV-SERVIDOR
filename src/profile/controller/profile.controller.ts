import {
  Controller,
  Get,
  UseGuards,
  Param,
  Put,
  Request,
  Body,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Pagination } from "nestjs-typeorm-paginate";
import { CurrentUser } from "src/auth/decorator/current-user.decorator";
import { PaginationParams } from "src/helpers/params";
import { User } from "src/user/model/entities/user.entity";
import { JwtAuthGuard } from "../../auth/guard/jwt-auth.guard";
import { CreateSubProfileDto } from "../model/dto/CreateSubProfileDto";
import { IdQueryParamDto } from "../model/dto/IdQueryParamDto";
import { UpdateSubProfileDto } from "../model/dto/UpdateSubProfileDto";
import { IProfileBase } from "../model/interface/profile-base.interface";
import { ISubProfile } from "../model/interface/sub-profile.interface";
import { ProfileService } from "../service/profile.service";

@Controller("profiles")
@ApiTags("Perfil")
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("sub/")
  async paginate(
    @Query() { page, limit, search, order, column, active }: PaginationParams,
  ): Promise<Pagination<ISubProfile>> {
    limit = Number(limit) > 100 ? 100 : limit;
    column = column ? column : "SPE_NOME";

    return this.profileService.paginate(
      {
        page: +page,
        limit: +limit,
        route: " ",
      },
      search,
      column,
      order,
      active,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("sub/all")
  findAll(): Promise<ISubProfile[]> {
    return this.profileService.findSubAll();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("sub/:id")
  findOne(@Param() idQueryParam: IdQueryParamDto) {
    return this.profileService.findSubOne(idQueryParam.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("sub/base/:id")
  findSubByBase(@Param() idQueryParam: IdQueryParamDto) {
    return this.profileService.findSubByBase(idQueryParam.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("base/all")
  findBaseAll(@Request() req: { user: User }): Promise<IProfileBase[]> {
    return this.profileService.findBaseAll(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("base/:id")
  findBaseOne(@Param() idQueryParam: IdQueryParamDto): Promise<IProfileBase> {
    return this.profileService.findBaseOne(idQueryParam.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("sub/")
  add(
    @CurrentUser() user: User,
    @Body() createSubProfileDto: CreateSubProfileDto,
  ): Promise<ISubProfile> {
    return this.profileService.add(createSubProfileDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put("sub/:id")
  update(
    @CurrentUser() user: User,
    @Param() idQueryParam: IdQueryParamDto,
    @Body() updateSchoolDto: UpdateSubProfileDto,
  ): Promise<ISubProfile> {
    return this.profileService.updateSub(
      idQueryParam.id,
      updateSchoolDto,
      user,
    );
  }
}
