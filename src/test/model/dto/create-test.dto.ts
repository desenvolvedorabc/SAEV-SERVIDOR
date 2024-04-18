import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { Headquarter } from "src/headquarters/model/entities/headquarter.entity";
import { Serie } from "src/serie/model/entities/serie.entity";
import { Subject } from "src/subject/model/entities/subject.entity";
import { TestTemplate } from "../entities/test-template.entity";

export class CreateTestDto {
  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  TES_NOME: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(4)
  @MaxLength(4)
  TES_ANO: string;

  @ApiProperty({
    type: Boolean,
  })
  @IsBoolean()
  TES_ATIVO: boolean;

  @ApiProperty({
    type: String,
  })
  @Type(() => Number)
  @IsInt()
  TES_DIS: Subject;

  @ApiProperty({
    type: String,
  })
  @Type(() => Number)
  @IsInt()
  TES_SER: Serie;

  @ApiProperty({
    type: String,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  TES_MAR?: Headquarter;

  @ApiProperty({
    type: String,
  })
  @IsString()
  @IsOptional()
  TES_ARQUIVO: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  @IsOptional()
  TES_MANUAL: string;

  @ApiProperty({
    type: Array<TestTemplate>(),
  })
  @IsOptional()
  @IsArray()
  TES_TEG: TestTemplate[];
}
