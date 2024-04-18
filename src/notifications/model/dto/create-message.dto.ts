import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CreateNotificationDto {
  @ApiProperty({
    type: String,
  })
  @IsString()
  message: string;
}
