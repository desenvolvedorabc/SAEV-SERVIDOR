import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsString, IsUrl } from "class-validator";
import { RoleExternalReport } from "./role-external-report.enum";

export class CreateExternalReportDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({
    message: "Informe o nome do relatório.",
  })
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({
    message: "Informe a categoria do relatório.",
  })
  category: string;

  @ApiProperty()
  @IsString()
  @IsEnum(RoleExternalReport)
  @IsNotEmpty({
    message: "Informe a hierarquia do relatório.",
  })
  role: RoleExternalReport;

  @ApiProperty()
  @IsString()
  @IsUrl(undefined, {
    message: 'Insira um link válido.'
  })
  @IsNotEmpty({
    message: "Informe o link do relatório.",
  })
  link: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({
    message: "Informe a descrição do relatório.",
  })
  description: string;
}
