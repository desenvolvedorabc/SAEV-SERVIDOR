import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateSerieDto {
  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(4)
  @MaxLength(255)
  SER_NOME: string;

  @ApiProperty({
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  SER_NUMBER: number;

  @ApiProperty({
    type: Boolean,
  })
  @IsBoolean()
  SER_ATIVO: boolean;
}
