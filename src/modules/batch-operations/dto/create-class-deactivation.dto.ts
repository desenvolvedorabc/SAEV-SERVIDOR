import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator'

import { BatchOperationCombinationDto } from './batch-operation-combination.dto'

export class CreateClassDeactivationDto {
  @ApiProperty({
    description:
      'Ano letivo (anterior ao corrente) das turmas a desativar. Ex: "2024".',
    example: '2024',
  })
  @IsString()
  @IsNotEmpty()
  @Length(4, 4)
  year: string

  @ApiProperty({
    description:
      'Combinações de município + rede. Cada combinação corresponde a uma tag adicionada na tela.',
    type: [BatchOperationCombinationDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BatchOperationCombinationDto)
  combinations: BatchOperationCombinationDto[]
}
