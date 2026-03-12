import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsNotEmpty, IsString, Length } from 'class-validator'

export class StudentResultDto {
  @ApiProperty({
    description: 'ID da avaliação',
    example: 1,
    type: Number,
  })
  @IsNotEmpty({
    message: 'O ID da avaliação é obrigatório',
  })
  @Type(() => Number)
  @IsInt({
    message: 'O ID da avaliação deve ser um número inteiro',
  })
  assessmentId: number

  @ApiProperty({
    description: 'ID do aluno',
    example: 123,
    type: Number,
  })
  @IsNotEmpty({
    message: 'O ID do aluno é obrigatório',
  })
  @Type(() => Number)
  @IsInt({
    message: 'O ID do aluno deve ser um número inteiro',
  })
  studentId: number

  @ApiProperty({
    description: 'Token de segurança para prevenir IDOR',
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6',
    type: String,
  })
  @IsNotEmpty({
    message: 'O token de segurança é obrigatório',
  })
  @IsString({
    message: 'O token deve ser uma string',
  })
  @Length(64, 64, {
    message: 'Token inválido',
  })
  token: string
}
