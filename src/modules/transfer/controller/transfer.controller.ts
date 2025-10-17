import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Pagination } from 'nestjs-typeorm-paginate'
import { PaginationParams } from 'src/helpers/params'
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator'
import { QueryIdParamDto } from 'src/modules/profile/model/dto/QueryIdParamDto'
import { User } from 'src/modules/user/model/entities/user.entity'

import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard'
import { ApprovedTransferDto } from '../model/dto/approved-transfer.dto copy'
import { CreateTransferDto } from '../model/dto/create-transfer.dto'
import { Transfer } from '../model/entities/transfer.entity'
import { TransferService } from '../service/transfer.service'

@Controller('transfer')
@ApiTags('Transferências')
export class TransferController {
  constructor(private transferService: TransferService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  add(
    @Request() req: { user: User },
    @Body() createTransferDto: CreateTransferDto,
  ): Promise<Transfer> {
    return this.transferService.add(createTransferDto, req.user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async paginate(
    @CurrentUser() user: User,
    @Query()
    params: PaginationParams,
  ): Promise<Pagination<Transfer>> {
    return this.transferService.paginate(params, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(':id')
  update(
    @CurrentUser() user: User,
    @Param() { id }: QueryIdParamDto,
    @Body() approvedTransferDto: ApprovedTransferDto,
  ): Promise<Transfer> {
    return this.transferService.update(id, approvedTransferDto, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  findOne(@Param() { id }: QueryIdParamDto): Promise<Transfer> {
    return this.transferService.findOne(id)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  async cancel(@Param() { id }: QueryIdParamDto): Promise<boolean> {
    return this.transferService.delete(id)
  }
}
