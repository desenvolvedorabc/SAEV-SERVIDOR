import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";
import { Area } from "src/area/model/entities/area.entity";
import { ProfileBase } from "../entities/profile-base.entity";

export class CreateSubProfileDto {
  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  SPE_NOME: string;

  @ApiProperty({
    type: Boolean,
  })
  @IsBoolean()
  SPE_ATIVO: boolean;

  @ApiProperty({
    type: String,
  })
  @Type(() => Number)
  @IsInt()
  SPE_PER: ProfileBase;

  @ApiProperty({
    type: Array<Area>(),
  })
  @IsArray()
  AREAS: Area[];
}
