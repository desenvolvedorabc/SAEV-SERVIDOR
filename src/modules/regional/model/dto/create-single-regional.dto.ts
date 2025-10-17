import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsArray, IsInt, IsNotEmpty, IsString } from 'class-validator'

export class CreateSingleRegionalDto {
  @ApiProperty()
  @IsNotEmpty({
    message: 'Informe o nome da regional.',
  })
  @IsString()
  name: string

  @ApiProperty({
    isArray: true,
  })
  @IsNotEmpty({ message: 'Informe as escolas.' })
  @IsArray()
  schoolsIds: number[]

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  stateId: number

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  countyId: number
}
