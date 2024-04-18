import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsInt,
  IsNumberString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { SchoolClass } from "src/school-class/model/entities/school-class.entity";
import { Student } from "src/student/model/entities/student.entity";

export class CreateSchoolAbsencesDto {
  @ApiProperty({
    type: String,
  })
  @Type(() => Number)
  @IsInt()
  IFR_ALU: Student;

  @ApiProperty({
    type: String,
  })
  @Type(() => Number)
  @IsInt()
  IFR_SCHOOL_CLASS: SchoolClass;

  @ApiProperty({
    type: Number,
    required: false,
  })
  @IsNumberString()
  @Min(1)
  @Max(12)
  IFR_MES: number;

  @ApiProperty({
    type: Number,
    required: false,
  })
  @IsNumberString()
  @MinLength(4)
  @MaxLength(4)
  IFR_ANO: number;

  @ApiProperty({
    type: Number,
    required: false,
  })
  @IsNumberString()
  @MinLength(1)
  @MaxLength(3)
  IFR_FALTA: number;
}
