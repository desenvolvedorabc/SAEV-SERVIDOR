import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class ImportResultStudentsDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  supplier: string
}
