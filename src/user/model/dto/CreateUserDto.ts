import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { County } from "../../../counties/model/entities/county.entity";
import { School } from "../../../school/model/entities/school.entity";
import { SubProfile } from "../../../profile/model/entities/sub-profile.entity";
import { Type } from "class-transformer";

export class CreateUserDto {
  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(6)
  @MaxLength(60)
  USU_NOME: string;

  @ApiProperty({
    type: String,
    nullable: true,
  })
  @IsString()
  @MaxLength(14)
  USU_FONE: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(14)
  USU_DOCUMENTO: string;

  @ApiProperty({
    type: String,
    nullable: true,
  })
  USU_AVATAR: string;

  @ApiProperty({
    type: String,
  })
  @IsEmail()
  @MinLength(6)
  USU_EMAIL: string;

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
  })
  @MinLength(6)
  @IsOptional()
  USU_SENHA: string;

  @ApiProperty({
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  USU_MUN: County;

  @ApiProperty({
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  USU_ESC: School;

  @ApiProperty({
    type: String,
  })
  @Type(() => Number)
  @IsInt()
  USU_SPE: SubProfile;
}
