import { ApiProperty } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { Test } from "src/test/model/entities/test.entity";
import { AssessmentCounty } from "../entities/assessment-county.entity";

export class CreateAssessmentDto {
  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  AVA_NOME: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(4)
  @MaxLength(4)
  AVA_ANO: string;

  @ApiProperty({
    type: Boolean,
  })
  @IsBoolean()
  AVA_ATIVO: boolean;

  @ApiProperty({
    type: Array<Test>(),
  })
  @IsArray()
  AVA_TES: Test[];

  @ApiProperty({
    type: Array<AssessmentCounty>(),
  })
  @IsArray()
  AVA_AVM: AssessmentCounty[];
}
