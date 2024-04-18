import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsDateString, IsNotEmpty, IsString } from "class-validator";

export class ChangeValuationDateDTO {
  @ApiProperty({
    type: Array<string>(),
  })
  @IsNotEmpty()
  @IsArray()
  idsCounties: number[];

  @ApiProperty()
  @IsDateString()
  newDate: Date;
}
