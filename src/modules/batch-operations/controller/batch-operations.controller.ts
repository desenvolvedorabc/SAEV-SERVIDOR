import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator'
import { RequireArea } from 'src/modules/auth/decorator/require-area.decorator'
import { Role } from 'src/modules/auth/decorator/role.decorator'
import { AreaGuard } from 'src/modules/auth/guard/area.guard'
import { JwtAuthGuard } from 'src/modules/auth/guard/jwt-auth.guard'
import { RolesGuard } from 'src/modules/auth/guard/roles.guard'
import { User } from 'src/modules/user/model/entities/user.entity'
import { AreaEnum } from 'src/shared/enums/area.enum'
import { RoleProfile } from 'src/shared/enums/role.enum'

import { CreateClassDeactivationDto } from '../dto/create-class-deactivation.dto'
import { CreateStudentDeactivationDto } from '../dto/create-student-deactivation.dto'
import { ListBatchOperationsQueryDto } from '../dto/list-batch-operations-query.dto'
import { BatchOperationService } from '../service/batch-operation.service'

@ApiTags('Operações em Lote')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, AreaGuard)
@Role([RoleProfile.SAEV])
@RequireArea(AreaEnum.OPR_LOTE)
@Controller('batch-operations')
export class BatchOperationsController {
  constructor(private readonly batchOperationService: BatchOperationService) {}

  @Post('/student-deactivation')
  @RequireArea(AreaEnum.OPR_LOTE)
  createStudentDeactivation(
    @CurrentUser() user: User,
    @Body() dto: CreateStudentDeactivationDto,
  ) {
    return this.batchOperationService.createStudentDeactivation(dto, user)
  }

  @Post('/class-deactivation')
  @RequireArea(AreaEnum.OPR_LOTE)
  createClassDeactivation(
    @CurrentUser() user: User,
    @Body() dto: CreateClassDeactivationDto,
  ) {
    return this.batchOperationService.createClassDeactivation(dto, user)
  }

  @Get('/class-deactivation/:id')
  @RequireArea(AreaEnum.OPR_LOTE)
  getClassDeactivationStatus(@Param('id', ParseIntPipe) id: number) {
    return this.batchOperationService.getStatus(id)
  }

  @Get('/in-progress')
  @RequireArea(AreaEnum.OPR_LOTE)
  isAnyInProgress() {
    return this.batchOperationService.isAnyInProgress()
  }

  @Get('/student-deactivation/:id')
  @RequireArea(AreaEnum.OPR_LOTE)
  getStatus(@Param('id', ParseIntPipe) id: number) {
    return this.batchOperationService.getStatus(id)
  }

  @Get('/')
  @RequireArea(AreaEnum.OPR_LOTE)
  listHistory(@Query() query: ListBatchOperationsQueryDto) {
    return this.batchOperationService.listHistory(query)
  }
}
