import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UploadImageAlternativeDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  image?: string;
}
