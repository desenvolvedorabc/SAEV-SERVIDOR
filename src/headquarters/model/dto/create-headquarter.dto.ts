import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";
import { Serie } from "src/serie/model/entities/serie.entity";
import { Subject } from "src/subject/model/entities/subject.entity";
import { HeadquarterTopic } from "../entities/headquarter-topic.entity";

export class CreateHeadquarterDto {
  @ApiProperty({
    type: String,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  MAR_NOME: string;

  @ApiProperty({
    type: Boolean,
  })
  @IsBoolean()
  MAR_ATIVO: boolean;

  @ApiProperty({
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  MAR_DIS: Subject;

  @ApiProperty({
    type: Array<Serie>(),
  })
  @IsArray()
  MAR_SER: Serie[];

  @ApiProperty({
    type: Array<HeadquarterTopic>(),
  })
  @IsArray()
  MAR_MTO: HeadquarterTopic[];
}
