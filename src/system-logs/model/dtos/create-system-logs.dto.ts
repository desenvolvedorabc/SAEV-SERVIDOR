import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsString } from "class-validator";
import { User } from "src/user/model/entities/user.entity";
import { MethodEnum } from "../enum/method.enum";

export class CreateSystemLogsDto {
  @ApiProperty({
    enum: MethodEnum,
  })
  @IsEnum(MethodEnum)
  method: MethodEnum;

  @ApiProperty({
    type: String,
  })
  @IsString()
  nameEntity: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  stateInitial: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  stateFinal: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  user: User;
}
