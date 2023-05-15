import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { County } from "src/counties/model/entities/county.entity";
import { Serie } from "src/serie/model/entities/serie.entity";
import { Teacher } from "src/teacher/model/entities/teacher.entity";
import { School } from "../../../school/model/entities/school.entity";

export class CreateSchoolClassDto {
  @ApiProperty({
    type: String,
  })
  @IsNumberString()
  @MinLength(4)
  @MaxLength(4)
  TUR_ANO: string;

  @ApiProperty({
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  TUR_MUN: County;

  @ApiProperty({
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  TUR_ESC: School;

  @ApiProperty({
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  TUR_SER: Serie;

  @ApiProperty({
    type: String,
  })
  @IsString()
  TUR_PERIODO: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  TUR_TIPO: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  TUR_NOME: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  TUR_TURNO: string;

  @ApiProperty({
    type: Boolean,
  })
  @IsBoolean()
  TUR_ATIVO: boolean;

  @ApiProperty({
    type: Array<Teacher>(),
  })
  @IsArray()
  @IsOptional()
  TUR_PRO: Teacher[];
}
