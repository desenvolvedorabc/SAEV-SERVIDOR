import { ApiProperty } from "@nestjs/swagger";
import { User } from "src/user/model/entities/user.entity";

export class ApprovedTransferDto {
  @ApiProperty({
    type: String,
  })
  TRF_STATUS: string;

  @ApiProperty({
    type: User,
    nullable: true,
  })
  TRF_USU_STATUS: User;

  @ApiProperty({
    type: String,
    nullable: true,
  })
  TRF_JUSTIFICATIVA: string;
}
