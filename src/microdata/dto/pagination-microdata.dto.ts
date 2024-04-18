import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty } from "class-validator";
import { PaginationParams } from "src/helpers/params";

export const exportFormatSinal = {
  tabulacao: '  ',
  ponto_virgula: ';',
  virgula: ',',
  pipe: '|'
}

enum ExportFormat {
  ponto_virgula = 'ponto_virgula',
  tabulacao = 'tabulacao',
  virgula = 'virgula',
  pipe = 'pipe',
}

export class PaginationMicroDataDto extends PaginationParams {
  @ApiProperty({
    type: ExportFormat
  })
  @IsNotEmpty()
  @IsEnum(ExportFormat)
  exportFormat:ExportFormat
}