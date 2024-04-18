import {
  Controller,
  Get,
  UseGuards,
  Param,
  Query,
  Request,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard } from "src/auth/guard/roles.guard";
import { PaginationParams } from "src/helpers/params";
import { IdQueryParamDto } from "src/profile/model/dto/IdQueryParamDto";
import { User } from "src/user/model/entities/user.entity";
import { JwtAuthGuard } from "../../auth/guard/jwt-auth.guard";
import { NotificationsService } from "../service/notification.service";

@ApiTags("Notificações")
@Controller("notifications")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get("/")
  paginate(
    @Request() req: { user: User },
    @Query()
    paginationParams: PaginationParams,
  ) {
    return this.notificationsService.paginate(paginationParams, req.user);
  }

  @Get(":id")
  findOne(@Request() req: { user: User }, @Param() {id}: IdQueryParamDto) {
    return this.notificationsService.findOne(id, req.user);
  }
}
