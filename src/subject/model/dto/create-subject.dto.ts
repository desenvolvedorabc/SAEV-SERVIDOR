import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsEnum, MaxLength, MinLength } from "class-validator";
import { SubjectTypeEnum } from "../enum/subject-type.enum";

export class CreateSubjectDto {
  @ApiProperty({
    type: String,
  })
  @MinLength(4)
  @MaxLength(255)
  DIS_NOME: string;

  @ApiProperty({
    type: String,
  })
  DIS_COLOR: string;

  @ApiProperty({
    type: Boolean,
  })
  @IsBoolean()
  DIS_ATIVO: boolean;

  @ApiProperty({
    enum: SubjectTypeEnum,
  })
  @IsEnum(SubjectTypeEnum)
  DIS_TIPO: SubjectTypeEnum;
}
