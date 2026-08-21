import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, MinLength } from 'class-validator'

export class ChangePasswordAuthenticatedDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Senha atual é obrigatória' })
  readonly currentPassword: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Nova senha é obrigatória' })
  @MinLength(6, { message: 'Nova senha deve ter no mínimo 6 caracteres' })
  readonly newPassword: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Confirmação de senha é obrigatória' })
  @MinLength(6, { message: 'Confirmação deve ter no mínimo 6 caracteres' })
  readonly confirmPassword: string
}
