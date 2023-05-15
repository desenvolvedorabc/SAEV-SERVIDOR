import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString } from "class-validator";
import { SchoolClass } from "src/school-class/model/entities/school-class.entity";
import { School } from "src/school/model/entities/school.entity";
import { Student } from "src/student/model/entities/student.entity";
import { User } from "src/user/model/entities/user.entity";

export class CreateTransferDto {
  @ApiProperty({
    type: String,
  })
  @Type(() => Number)
  @IsInt()
  TRF_ALU: Student;

  @ApiProperty({
    type: String,
  })
  @Type(() => Number)
  @IsInt()
  TRF_ESC_ORIGEM: School;

  @ApiProperty({
    type: String,
  })
  @Type(() => Number)
  @IsInt()
  TRF_ESC_DESTINO: School;

  @ApiProperty({
    type: String,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  TRF_TUR_ORIGEM: SchoolClass;

  @ApiProperty({
    type: String,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  TRF_TUR_DESTINO: SchoolClass;

  @ApiProperty({
    type: String,
  })
  TRF_STATUS: string;

  @ApiProperty({
    type: User,
  })
  TRF_USU_STATUS: User;

  @ApiProperty({
    type: String,
  })
  TRF_JUSTIFICATIVA: string;
}
