import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsInt } from "class-validator";
import { SchoolClass } from "src/school-class/model/entities/school-class.entity";
import { School } from "src/school/model/entities/school.entity";
import { Serie } from "src/serie/model/entities/serie.entity";

export class GroupStudentDto {
  @ApiProperty({
    type: Array<number>(),
  })
  @IsArray()
  students: number[];

  @ApiProperty({
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  ALU_SER: Serie;

  @ApiProperty({
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  ALU_ESC: School;

  @ApiProperty({
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  ALU_TUR: SchoolClass;
}
