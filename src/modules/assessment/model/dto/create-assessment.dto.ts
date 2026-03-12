import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { Test } from 'src/modules/test/model/entities/test.entity'

import { EditionTypeEnum } from '../enum/edition-type.enum'
import { AssessmentCountyWithPeriodDto } from './assessment-county-with-period.dto'

export class CreateAssessmentDto {
  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  AVA_NOME: string

  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(4)
  @MaxLength(4)
  AVA_ANO: string

  @ApiProperty({
    type: Boolean,
  })
  @IsBoolean()
  AVA_ATIVO: boolean

  @ApiProperty({
    type: Date,
    description: 'Data de início do período da edição',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  AVA_DT_INICIO?: Date

  @ApiProperty({
    type: Date,
    description: 'Data de fim do período da edição',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  AVA_DT_FIM?: Date

  @ApiProperty({
    enum: EditionTypeEnum,
    description:
      'Tipo de edição: GERAL (todos os municípios podem aderir) ou ESPECIFICO (apenas municípios adicionados podem participar)',
    default: EditionTypeEnum.GERAL,
  })
  @IsEnum(EditionTypeEnum)
  AVA_TIPO: EditionTypeEnum

  @ApiProperty({
    type: Array<Test>(),
  })
  @IsArray()
  AVA_TES: Test[]

  @ApiProperty({
    type: [AssessmentCountyWithPeriodDto],
    description:
      'Municípios participantes. Para edições GERAL: opcional (todos municípios podem aderir). Para edições ESPECIFICO: obrigatório (apenas municípios listados podem participar). SAEV pode opcionalmente definir períodos para cada município.',
    example: [
      {
        countyId: 123,
        type: 'MUNICIPAL',
        AVM_DT_INICIO: '2025-04-01T00:00:00',
        AVM_DT_FIM: '2025-05-15T23:59:59',
      },
      {
        countyId: 456,
        type: 'MUNICIPAL',
      },
    ],
    required: false,
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AssessmentCountyWithPeriodDto)
  AVA_AVM?: AssessmentCountyWithPeriodDto[]
}
