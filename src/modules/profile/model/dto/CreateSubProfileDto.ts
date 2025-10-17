import { ApiProperty } from '@nestjs/swagger'
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator'
import { Area } from 'src/modules/area/model/entities/area.entity'
import { RoleProfile } from 'src/shared/enums/role.enum'

export class CreateSubProfileDto {
  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  SPE_NOME: string

  @ApiProperty({
    enum: RoleProfile,
  })
  @IsEnum(RoleProfile)
  @IsNotEmpty({
    message: 'Informe a role do perfil.',
  })
  role: RoleProfile

  @ApiProperty({
    type: Array<Area>(),
  })
  @IsArray()
  AREAS: Area[]
}
