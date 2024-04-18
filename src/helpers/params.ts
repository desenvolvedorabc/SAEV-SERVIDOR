import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { MethodEnum } from "src/system-logs/model/enum/method.enum";
import { Transform } from "class-transformer";

export class PaginationParams {
  @ApiProperty({
    type: Number,
    default: 1,
  })
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  page = 1;

  @ApiProperty({
    type: Number,
    default: 10,
  })
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  limit = 10;

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  search: string;

  @ApiProperty({
    type: String,
    required: false,
    default: "ASC",
  })
  @IsString()
  @IsOptional()
  order: 'ASC' | 'DESC' = 'ASC';

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  status: string;

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsOptional()
  active?: '0' | '1' = null;

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  column: string;

  @ApiProperty({
    type: Number,
    required: false,
  })
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  @IsOptional()
  county: number;

  @ApiProperty({
    type: Number,
    required: false,
  })
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  @IsOptional()
  school: number;

  @ApiProperty({
    type: Number,
    required: false,
  })
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  @IsOptional()
  schoolClass: number;

  @ApiProperty({
    type: Number,
    required: false,
  })
  @IsNumberString()
  @MinLength(1)
  @MaxLength(2)
  @IsOptional()
  month: number;

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  profileBase: string;

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  subProfile: string;

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  subject: string;

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  edition: string;

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  serie: string;

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  year: string;

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  type: string;

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  student: string;

  isCsv? = false
}

export class PaginationParamsLogs {
  @ApiProperty({
    type: String,
    default: "1",
  })
  @IsString()
  page: string;

  @ApiProperty({
    type: String,
    default: "10",
  })
  @IsString()
  limit: string;

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  search: string;

  @ApiProperty({
    type: String,
    required: false,
    default: "ASC",
  })
  @IsString()
  @IsOptional()
  order: "ASC" | "DESC";

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  column: string;

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  county: string;

  @ApiProperty({
    type: Number,
    required: false,
  })
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  @IsOptional()
  school: number;

  @ApiProperty({
    enum: MethodEnum,
    required: false,
  })
  @IsEnum(MethodEnum)
  @IsOptional()
  method: MethodEnum;

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  entity: string;

  @ApiProperty({
    type: Date,
    required: false,
  })
  @IsDateString()
  @IsOptional()
  initialDate: Date;

  @ApiProperty({
    type: Date,
    required: false,
  })
  @IsDateString()
  @IsOptional()
  finalDate: Date;
}
