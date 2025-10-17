import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Pagination } from 'nestjs-typeorm-paginate'
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator'
import { QueryIdParamDto } from 'src/modules/profile/model/dto/QueryIdParamDto'
import { User } from 'src/modules/user/model/entities/user.entity'

import { PaginationParams } from '../../../helpers/params'
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard'
import { CreateCountyDto } from '../model/dto/create-county.dto'
import { UpdateCountyDto } from '../model/dto/update-county.dto'
import { County } from '../model/entities/county.entity'
import { ICounty } from '../model/interface/county.interface'
import { CountiesService } from '../service/counties.service'

@ApiTags('Municípios')
@Controller('counties')
export class CountiesController {
  constructor(private readonly countiesService: CountiesService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  create(
    @CurrentUser() user: User,
    @Body() createCountyDto: CreateCountyDto,
  ): Promise<void> {
    return this.countiesService.create(createCountyDto, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/all')
  findAll(@CurrentUser() user: User): Promise<ICounty[]> {
    return this.countiesService.findAll(user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  paginate(
    @CurrentUser() user: User,
    @Query() params: PaginationParams,
  ): Promise<Pagination<County>> {
    return this.countiesService.paginate(params, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/report')
  getCountiesReport(
    @Query() paginateParams: PaginationParams,
    @CurrentUser() user: User,
  ) {
    return this.countiesService.getCountiesReport(paginateParams, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/:id/report')
  findOneReport(@Param() { id }: QueryIdParamDto, @CurrentUser() user: User) {
    return this.countiesService.findOneReport(id, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/:id')
  findOne(@Param() { id }: QueryIdParamDto) {
    return this.countiesService.findOne(id)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put('/:id')
  update(
    @CurrentUser() user: User,
    @Param() { id }: QueryIdParamDto,
    @Body() updateCountyDto: UpdateCountyDto,
  ) {
    return this.countiesService.update(id, updateCountyDto, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('/:id/change-share-data')
  changeShareData(@CurrentUser() user: User, @Param() { id }: QueryIdParamDto) {
    return this.countiesService.changeShareData(id, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/districts/:uf')
  findDistrict(
    @Param('uf') uf: string,
    @CurrentUser() user: User,
  ): Promise<County[]> {
    return this.countiesService.findDistrict(uf, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('/avatar/upload')
  async uploadAvatar(@CurrentUser() user: User, @Body() data: any) {
    const { MUN_ID, filename, base64 } = data
    return this.countiesService.updateAvatar(MUN_ID, filename, base64, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('/file/upload')
  async uploadFile(@CurrentUser() user: User, @Body() data: any) {
    const { MUN_ID, filename, base64 } = data
    return this.countiesService.updateFile(+MUN_ID, filename, base64, user)
  }

  @Get('/avatar/:imgpath')
  seeUploadedAvatar(@Param('imgpath') image: string, @Res() res) {
    return res.sendFile(image, { root: './public/county/avatar' })
  }

  @Get('/file/:filepath')
  seeUploadedFile(@Param('filepath') image: string, @Res() res) {
    return res.sendFile(image, { root: './public/county/file' })
  }
}
