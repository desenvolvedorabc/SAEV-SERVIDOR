import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { County } from "../../../counties/model/entities/county.entity";

export class CreateSchoolDto {
  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  ESC_NOME: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  ESC_UF: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  ESC_CIDADE: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(6)
  @MaxLength(255)
  ESC_ENDERECO: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  ESC_NUMERO: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  ESC_COMPLEMENTO: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  ESC_BAIRRO: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(9)
  @MaxLength(9)
  ESC_CEP: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  ESC_LOGO: string;

  @ApiProperty({
    type: Boolean,
  })
  @IsBoolean()
  ESC_ATIVO: boolean;

  @ApiProperty({
    type: Boolean,
  })
  @IsBoolean()
  @IsNotEmpty()
  ESC_INTEGRAL: boolean;

  ESC_STATUS: string = "amarelo";

  @ApiProperty({
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  ESC_MUN: County;

  @ApiProperty({
    type: String,
  })
  @IsString()
  ESC_INEP: string;
}
