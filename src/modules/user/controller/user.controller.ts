import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator'
import { QueryIdParamDto } from 'src/modules/profile/model/dto/QueryIdParamDto'

import { PaginationParams } from '../../../helpers/params'
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard'
import { CreateUserDto } from '../model/dto/CreateUserDto'
import { UpdateUserDto } from '../model/dto/UpdateUserDto'
import { User } from '../model/entities/user.entity'
import { UserService } from '../service/user.service'

@Controller('users')
@ApiTags('Usuário')
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  create(@CurrentUser() user: User, @Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/all')
  findAll() {
    return this.userService.findAll()
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async paginate(
    @CurrentUser() user: User,
    @Query()
    params: PaginationParams,
  ) {
    return this.userService.paginate(params, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/:id')
  findOne(@Param() { id }: QueryIdParamDto) {
    return this.userService.findOne(id)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('/welcome-reset-password/:id')
  welcomePasswordChangeLink(@Param() { id }: QueryIdParamDto) {
    return this.userService.welcomePasswordChangeLink(id)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put('/:id')
  update(
    @CurrentUser() user: User,
    @Param() { id }: QueryIdParamDto,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.updateUser(id, updateUserDto, user)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('/avatar/upload')
  async uploadAvatar(@CurrentUser() user: User, @Body() data: any) {
    const { USU_ID, filename, base64 } = data
    return this.userService.updateAvatar(+USU_ID, filename, base64, user)
  }

  @Get('/avatar/:imgpath')
  seeUploadedAvatar(@Param('imgpath') image: string, @Res() res) {
    return res.sendFile(image, { root: './public/user/avatar' })
  }
}
