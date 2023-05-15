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
  ValidateNested,
} from "class-validator";
import { HeadquarterTopicItem } from "src/headquarters/model/entities/headquarter-topic-item.entity";
import { Student } from "src/student/model/entities/student.entity";
import { TestTemplate } from "src/test/model/entities/test-template.entity";
import { Test } from "src/test/model/entities/test.entity";
import { User } from "src/user/model/entities/user.entity";
import { StudentTestAnswer } from "../entities/student-test-answer.entity";
import { StudentTest } from "../entities/student-test.entity";

export class CreateStudentsTestsDto {
  @ApiProperty({
    type: Boolean,
  })
  @IsBoolean()
  ALT_ATIVO: boolean;

  @ApiProperty({
    type: Test,
  })
  @Type(() => Number)
  @IsInt()
  ALT_TES: Test;

  @ApiProperty({
    type: Student,
  })
  @Type(() => Number)
  @IsInt()
  ALT_ALU: Student;

  @ApiProperty({
    type: User,
  })
  @Type(() => Number)
  @IsInt()
  ALT_USU: User;

  @ApiProperty({
    type: Boolean,
  })
  @IsBoolean()
  ALT_FINALIZADO: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
  })
  ALT_JUSTIFICATIVA: string;

  @ApiProperty({
    type: Array<CreateStudentsTestsAnswersDto>(),
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStudentsTestsAnswersDto)
  ALT_RESPOSTAS: CreateStudentsTestsAnswersDto[];
}

export class CreateStudentsTestsAnswersDto {
  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsOptional()
  ATR_RESPOSTA: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  ATR_TEG: TestTemplate;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  ATR_ID?: number;

  @ApiProperty({
    type: HeadquarterTopicItem,
  })
  @IsOptional()
  ATR_MTI?: HeadquarterTopicItem;

  ATR_CERTO: boolean;

  ATR_ALT: StudentTest;
}
