import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsArray, IsInt } from 'class-validator'
import { School } from 'src/modules/school/model/entities/school.entity'
import { SchoolClass } from 'src/modules/school-class/model/entities/school-class.entity'
import { Serie } from 'src/modules/serie/model/entities/serie.entity'

export class GroupStudentDto {
  @ApiProperty({
    type: Array<number>(),
  })
  @IsArray()
  students: number[]

  @ApiProperty({
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  ALU_SER: Serie

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
  ALU_TUR: SchoolClass
}
