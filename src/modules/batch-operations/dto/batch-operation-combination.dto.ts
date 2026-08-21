import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsInt, IsPositive } from 'class-validator'

import { TypeSchoolEnum } from '../../school/model/enum/type-school.enum'

export class BatchOperationCombinationDto {
  @ApiProperty({ description: 'ID do município (MUN_ID)', example: 1 })
  @IsInt()
  @IsPositive()
  countyId: number

  @ApiProperty({
    description: 'Rede de ensino. "Ambas" é expandida no front em duas tags.',
    enum: TypeSchoolEnum,
    example: TypeSchoolEnum.MUNICIPAL,
  })
  @IsEnum(TypeSchoolEnum)
  network: TypeSchoolEnum
}
