import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator'

import { BatchOperationCombinationDto } from './batch-operation-combination.dto'

export class CreateStudentDeactivationDto {
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
