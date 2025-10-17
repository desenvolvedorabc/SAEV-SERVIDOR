import { ApiProperty } from '@nestjs/swagger'
import {
  IsArray,
  IsBoolean,
  IsNumberString,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator'
import { County } from 'src/modules/counties/model/entities/county.entity'
import { School } from 'src/modules/school/model/entities/school.entity'
import { Serie } from 'src/modules/serie/model/entities/serie.entity'
import { Teacher } from 'src/modules/teacher/model/entities/teacher.entity'

export class CreateMessageDto {
  @ApiProperty({
    type: String,
  })
  @IsString()
  MEN_TITLE: string

  @ApiProperty({
    type: String,
  })
  @IsString()
  MEN_TEXT: string

  @ApiProperty({
    type: Array<string>(),
  })
  @IsArray()
  MUNICIPIOS: string[]

  @ApiProperty({
    type: Array<string>(),
  })
  @IsArray()
  ESCOLAS: string[]
}
