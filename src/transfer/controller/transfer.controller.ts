import {
  Controller,
  Get,
  UseGuards,
  Param,
  Request,
  Post,
  Body,
  Put,
  Query,
  Delete,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Pagination } from "nestjs-typeorm-paginate";
import {
  CurrentUser,
  CurrentUserId,
} from "src/auth/decorator/current-user.decorator";
import { PaginationParams } from "src/helpers/params";
import { IdQueryParamDto } from "src/profile/model/dto/IdQueryParamDto";
import { User } from "src/user/model/entities/user.entity";
import { JwtAuthGuard } from "../../auth/guard/jwt-auth.guard";
import { ApprovedTransferDto } from "../model/dto/approved-transfer.dto copy";
import { CreateTransferDto } from "../model/dto/create-transfer.dto";
import { Transfer } from "../model/entities/transfer.entity";
import { TransferService } from "../service/transfer.service";

@Controller("transfer")
@ApiTags("Transferências")
export class TransferController {
  constructor(private transferService: TransferService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  add(
    @Request() req: { user: User },
    @Body() createTransferDto: CreateTransferDto,
  ): Promise<Transfer> {
    return this.transferService.add(createTransferDto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async paginate(
    @Request() req: { user: User },
    @CurrentUserId() userId: string,
    @Query()
    { page, limit, status, county, school, order, student }: PaginationParams,
  ): Promise<Pagination<Transfer>> {
    limit = Number(limit) > 100 ? 100 : limit;
    return this.transferService.paginate(
      {
        page: +page,
        limit: +limit,
        route: " ",
      },
      userId,
      status,
      county,
      school,
      order,
      student,
      req.user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(":id")
  update(
    @CurrentUser() user: User,
    @Param() {id}: IdQueryParamDto,
    @Body() approvedTransferDto: ApprovedTransferDto,
  ): Promise<Transfer> {
    return this.transferService.update(id, approvedTransferDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(":id")
  findOne(
    @Param() {id}: IdQueryParamDto,
  ): Promise<Transfer> {
    return this.transferService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(":id")
  async cancel(@Param() {id}: IdQueryParamDto): Promise<boolean> {
    return this.transferService.delete(id);
  }
}
