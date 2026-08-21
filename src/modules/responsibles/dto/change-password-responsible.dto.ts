import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, MinLength } from 'class-validator'

export class ChangePasswordResponsibleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Token é obrigatório' })
  readonly token: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  readonly password: string
}
