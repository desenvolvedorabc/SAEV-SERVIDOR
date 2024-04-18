import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsString, MaxLength, MinLength } from "class-validator";

export class CreateFileDto {
    @ApiProperty({
        type: String,
    })
    @IsString()
    @MinLength(2)
    @MaxLength(255)
    ARQ_NOME: string;
   
    @ApiProperty({
        type: String,
    })
    @IsString()
    ARQ_URL: string;

    @ApiProperty({
        type: Boolean,
    })
    @IsBoolean()
    ARQ_ATIVO: boolean;
}
