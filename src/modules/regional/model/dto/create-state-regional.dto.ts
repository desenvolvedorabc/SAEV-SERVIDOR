import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsArray, IsInt, IsNotEmpty, IsString } from 'class-validator'

export class CreateStateRegionalDto {
  @ApiProperty()
  @IsNotEmpty({
    message: 'Informe o nome da regional.',
  })
  @IsString()
  name: string

  @ApiProperty({
    isArray: true,
  })
  @IsNotEmpty({ message: 'Informe os municípios' })
  @IsArray()
  countiesIds: number[]

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  stateId: number
}
