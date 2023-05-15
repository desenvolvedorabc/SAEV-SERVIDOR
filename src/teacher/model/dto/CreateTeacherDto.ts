import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { Formation } from "../entities/formation.entity";
import { Gender } from "../entities/gender.entity";
import { Skin } from "../entities/skin.entity";
import { County } from "../../../counties/model/entities/county.entity";
import { Type } from "class-transformer";

export class CreateTeacherDto {
  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(6)
  @MaxLength(60)
  PRO_NOME: string;

  @ApiProperty({
    type: String,
    nullable: true,
  })
  @IsString()
  @MaxLength(14)
  PRO_FONE: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(14)
  PRO_DOCUMENTO: string;

  @ApiProperty({
    type: String,
    nullable: true,
  })
  PRO_AVATAR: string;

  @ApiProperty({
    type: String,
  })
  @IsEmail()
  @MinLength(6)
  PRO_EMAIL: string;

  @ApiProperty({
    type: String,
  })
  @Type(() => Number)
  @IsInt()
  PRO_FOR: Formation;

  @ApiProperty({
    type: Date,
    nullable: true,
  })
  PRO_DT_NASC: Date;

  @ApiProperty({
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  PRO_GEN: Gender;

  @ApiProperty({
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  PRO_PEL: Skin;

  @ApiProperty({
    type: Boolean,
  })
  @IsBoolean()
  PRO_ATIVO: boolean;

  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  PRO_UF: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  PRO_CIDADE: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(6)
  @MaxLength(255)
  PRO_ENDERECO: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  PRO_NUMERO: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  PRO_COMPLEMENTO: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  PRO_BAIRRO: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(9)
  @MaxLength(9)
  PRO_CEP: string;

  @ApiProperty({
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  PRO_MUN: County;
}
