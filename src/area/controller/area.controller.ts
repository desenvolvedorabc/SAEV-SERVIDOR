import { Controller, Get, UseGuards, Request, Param } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IdQueryParamDto } from "src/profile/model/dto/IdQueryParamDto";
import { User } from "src/user/model/entities/user.entity";
import { JwtAuthGuard } from "../../auth/guard/jwt-auth.guard";
import { IArea } from "../model/interface/area.interface";
import { AreaService } from "../service/area.service";

@Controller("area")
@ApiTags("Área do Sistema")
export class AreaController {
  constructor(private areaService: AreaService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/all")
  findAll(): Promise<IArea[]> {
    return this.areaService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("/all/:perfil")
  findByProfile(@Param("perfil") perfil: string): Promise<IArea[]> {
    return this.areaService.findByProfile(perfil);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(":id")
  findOne(@Param() {id}: IdQueryParamDto) {
    return this.areaService.findOne(id);
  }
}
