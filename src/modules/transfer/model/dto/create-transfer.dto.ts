import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString } from 'class-validator'
import { School } from 'src/modules/school/model/entities/school.entity'
import { SchoolClass } from 'src/modules/school-class/model/entities/school-class.entity'
import { Student } from 'src/modules/student/model/entities/student.entity'
import { User } from 'src/modules/user/model/entities/user.entity'

export class CreateTransferDto {
  @ApiProperty({
    type: String,
  })
  @Type(() => Number)
  @IsInt()
  TRF_ALU: Student

  @ApiProperty({
    type: String,
  })
  @Type(() => Number)
  @IsInt()
  TRF_ESC_ORIGEM: School

  @ApiProperty({
    type: String,
  })
  @Type(() => Number)
  @IsInt()
  TRF_ESC_DESTINO: School

  @ApiProperty({
    type: String,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  TRF_TUR_ORIGEM: SchoolClass

  @ApiProperty({
    type: String,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  TRF_TUR_DESTINO: SchoolClass

  @ApiProperty({
    type: String,
  })
  TRF_STATUS: string

  @ApiProperty({
    type: User,
  })
  TRF_USU_STATUS: User

  @ApiProperty({
    type: String,
  })
  TRF_JUSTIFICATIVA: string
}
