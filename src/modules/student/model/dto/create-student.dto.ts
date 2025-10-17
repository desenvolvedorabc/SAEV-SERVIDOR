import { ApiProperty } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator'

import { UF } from '../../../../shared/enums/uf.enum'
import { Pcd } from '../../../../shared/model/entities/pcd.entity'
import { School } from '../../../school/model/entities/school.entity'
import { SchoolClass } from '../../../school-class/model/entities/school-class.entity'
import { Serie } from '../../../serie/model/entities/serie.entity'
import { Gender } from '../../../teacher/model/entities/gender.entity'
import { Skin } from '../../../teacher/model/entities/skin.entity'

export class CreateStudentDto {
  @ApiProperty({
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  ALU_ESC: School

  @ApiProperty({
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  ALU_SER: Serie

  @ApiProperty({
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  ALU_TUR: SchoolClass

  @ApiProperty({
    type: String,
  })
  @IsString()
  @IsOptional()
  ALU_AVATAR: string

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  ALU_INEP: string

  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  @Transform(({ value }) =>
    value
      ?.toUpperCase()
      ?.replace(/^\s+|\s+$/g, '')
      ?.replace(/\s+/g, ' '),
  )
  ALU_NOME: string

  @ApiProperty({
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  ALU_GEN: Gender

  @ApiProperty({
    type: String,
  })
  @IsString()
  @Transform(({ value }) =>
    value
      ?.toUpperCase()
      ?.replace(/^\s+|\s+$/g, '')
      ?.replace(/\s+/g, ' '),
  )
  ALU_NOME_MAE: string

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value
      ?.toUpperCase()
      ?.replace(/^\s+|\s+$/g, '')
      ?.replace(/\s+/g, ' '),
  )
  ALU_NOME_PAI: string

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value
      ?.toUpperCase()
      ?.replace(/^\s+|\s+$/g, '')
      ?.replace(/\s+/g, ' '),
  )
  ALU_NOME_RESP: string

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    return value ? value.replace(/\D/g, '') : value
  })
  @IsPhoneNumber('BR', { message: 'Número de WhatsApp inválido' })
  ALU_WHATSAPP?: string

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  ALU_TEL1: string

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  ALU_TEL2: string

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  ALU_EMAIL: string

  @ApiProperty({
    type: Array<Pcd>,
  })
  @IsOptional()
  @IsArray()
  ALU_DEFICIENCIAS?: Pcd[]

  @ApiProperty({
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  ALU_PEL: Skin

  @ApiProperty({
    type: String,
  })
  @IsString()
  ALU_DT_NASC: string

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
  })
  @IsString()
  @MaxLength(9)
  @IsOptional()
  ALU_CEP: string

  @ApiProperty({
    enum: UF,
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsEnum(UF)
  ALU_UF: UF

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  ALU_CIDADE: string

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  ALU_ENDERECO: string

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  ALU_NUMERO: string

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  ALU_COMPLEMENTO: string

  @ApiProperty({
    type: String,
  })
  @IsOptional()
  @IsString()
  ALU_CPF: string

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  ALU_BAIRRO: string

  @ApiProperty({
    type: Boolean,
  })
  @IsBoolean()
  ALU_ATIVO: boolean

  @ApiProperty({
    type: String,
  })
  @IsString()
  ALU_STATUS: string

  ALU_DEFICIENCIA_BY_IMPORT?: string
}
