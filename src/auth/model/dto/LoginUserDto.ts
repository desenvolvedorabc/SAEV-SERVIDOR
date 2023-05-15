import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({
    type: String,
  })
  @IsEmail()
  @MinLength(6)
  USU_EMAIL: string;

  @ApiProperty({
    type: String
  })
  @IsNotEmpty()
  @MinLength(6)
  USU_SENHA: string;
}
