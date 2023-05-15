import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateCountyDto {
    @ApiProperty({
        type: String,
    })
    @IsString()
    @MinLength(2)
    @MaxLength(255)
    MUN_NOME: string;


    @ApiProperty({
        type: String,
    })
    @IsString()
    @MinLength(2)
    @MaxLength(2)
    MUN_UF: string;

    @ApiProperty({
        type: String,
    })
    @IsString()
    @MinLength(2)
    @MaxLength(255)
    MUN_CIDADE: string;

    @ApiProperty({
        type: String,
    })
    @IsString()
    @MinLength(6)
    @MaxLength(255)
    MUN_ENDERECO: string;

    @ApiProperty({
        type: String,
    })
    @IsString()
    @MinLength(1)
    @MaxLength(20)
    MUN_NUMERO: string;

    @ApiProperty({
        type: String,
    })
    @IsString()
    MUN_COMPLEMENTO: string;

    @ApiProperty({
        type: String,
    })
    @IsString()
    @MinLength(2)
    @MaxLength(255)
    MUN_BAIRRO: string;

    @ApiProperty({
        type: String,
    })
    @IsString()
    @MinLength(9)
    @MaxLength(9)
    MUN_CEP: string;

    @ApiProperty({
        type: String,
    })
    @IsOptional()
    @IsNumber()
    MUN_COD_IBGE: number

    @ApiProperty({
        type: Date,
    })
    @IsDateString()
    MUN_DT_INICIO: Date;


    @ApiProperty({
        type: Date,
    })
    @IsDateString()
    MUN_DT_FIM: Date;

    @ApiProperty({
        type: String,
    })
    @IsString()
    MUN_ARQ_CONVENIO: string;

    @ApiProperty({
        type: String,
    })
    @IsString()
    MUN_LOGO: string;

    @ApiProperty({
        type: Boolean,
    })
    @IsBoolean()
    MUN_ATIVO: boolean;

    @ApiProperty({
        type: String
    })
    @IsString()
    MUN_STATUS: string;
}
