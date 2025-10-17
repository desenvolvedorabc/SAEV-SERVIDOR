import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { PaginationParams } from 'src/helpers/params'
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator'
import { User } from 'src/modules/user/model/entities/user.entity'

import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard'
import { CreateSubProfileDto } from '../model/dto/CreateSubProfileDto'
import { QueryIdParamDto } from '../model/dto/QueryIdParamDto'
import { UpdateSubProfileDto } from '../model/dto/UpdateSubProfileDto'
import { ISubProfile } from '../model/interface/sub-profile.interface'
import { ProfileService } from '../service/profile.service'

@Controller('profiles')
@ApiTags('Perfil')
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async paginate(@Query() params: PaginationParams) {
    return this.profileService.paginate(params)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/:id')
  findOne(@Param() { id }: QueryIdParamDto) {
    return this.profileService.findOne(id)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  create(
    @CurrentUser() user: User,
    @Body() createSubProfileDto: CreateSubProfileDto,
  ) {
    return this.profileService.create(createSubProfileDto, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put('/:id')
  update(
    @CurrentUser() user: User,
    @Param() querIdParam: QueryIdParamDto,
    @Body() updateSchoolDto: UpdateSubProfileDto,
  ): Promise<ISubProfile> {
    return this.profileService.update(querIdParam.id, updateSchoolDto, user)
  }
}
