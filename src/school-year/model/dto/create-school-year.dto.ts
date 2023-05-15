import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNumberString, MaxLength, MinLength } from "class-validator";

export class CreateSchoolYearDto {
    @ApiProperty({
        type: String,
    })
    @IsNumberString()
    @MinLength(4)
    @MaxLength(4)
    ANO_NOME: string;

    @ApiProperty({
        type: Boolean,
    })
    @IsBoolean()
    ANO_ATIVO: boolean;
}
