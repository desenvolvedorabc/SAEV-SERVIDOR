import { ApiProperty } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'

export class ImportResultStudentDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  testId: number

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  studentId: number

  @ApiProperty({
    nullable: true,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(2)
  justificationLevel?: number = null

  @ApiProperty({
    nullable: true,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(2)
  readingLevel?: number = null

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  supplier: string

  @ApiProperty({
    type: Array<StudentsTestsAnswersDto>(),
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentsTestsAnswersDto)
  answers: StudentsTestsAnswersDto[]
}

export class StudentsTestsAnswersDto {
  @ApiProperty({
    type: String,
  })
  @Transform(({ value }) =>
    ['A', 'B', 'C', 'D', '-'].includes(String(value).toUpperCase())
      ? String(value).toUpperCase()
      : '-',
  )
  @IsString()
  @IsNotEmpty()
  response: 'A' | 'B' | 'C' | 'D' | '-'

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  questionId: number
}
