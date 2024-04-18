import { ApiProperty } from "@nestjsx/crud/lib/crud";
import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmpty, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";

export class AlternativeQuestion {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1)
  option?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  image?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description: string;
}

export class QuestionAssessment {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  order: number;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @Type(() => AlternativeQuestion)
  alternatives: AlternativeQuestion[]
}

export class PageAssessment {
  @ApiProperty()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  image?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  order: number;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => QuestionAssessment)
  questions: QuestionAssessment[]
}


export class CreateAssessmentOnlineDto {
  @ApiProperty()
  @IsNotEmpty()
  testId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => PageAssessment)
  pages: PageAssessment[]
}
