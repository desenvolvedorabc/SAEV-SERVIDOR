import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsOptional } from "class-validator";

export class GetTestHerby {
  @ApiProperty({
    type: Number
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  countyId: number;

  @ApiProperty({
    required: false,
    type: Number
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  schoolId: number;
}