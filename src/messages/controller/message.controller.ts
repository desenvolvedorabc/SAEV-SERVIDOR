import {
  Controller,
  Get,
  UseGuards,
  Param,
  Body,
  Post,
  Query,
  Delete,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "src/auth/decorator/current-user.decorator";
import { PaginationParams } from "src/helpers/params";
import { IdQueryParamDto } from "src/profile/model/dto/IdQueryParamDto";
import { User } from "src/user/model/entities/user.entity";
import { JwtAuthGuard } from "../../auth/guard/jwt-auth.guard";
import { CreateMessageDto } from "../model/dto/create-message.dto";
import { Message } from "../model/entities/message.entity";
import { MessagesService } from "../service/message.service";

@ApiTags("Mensagens")
@Controller("messages")
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/")
  paginate(
    @Query()
    paginationParams: PaginationParams,
  ) {
    return this.messagesService.paginate(paginationParams);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(":id")
  findOne(@Param() {id}: IdQueryParamDto) {
    return this.messagesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(":id")
  delete(@CurrentUser() user: User, @Param() {id}: IdQueryParamDto) {
    return this.messagesService.delete(id, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  create(
    @CurrentUser() user: User,
    @Body() createMessagesDto: CreateMessageDto,
  ): Promise<Message> {
    return this.messagesService.create(createMessagesDto, user);
  }
}
