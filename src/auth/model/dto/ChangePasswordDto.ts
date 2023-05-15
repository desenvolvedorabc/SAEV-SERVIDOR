import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    readonly password: string;

    @IsString()
    @IsOptional()
    @ApiProperty()
    readonly token: string;
}