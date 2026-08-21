import { IsInt, IsPositive } from 'class-validator'

export class DispatchTaskDto {
  @IsInt()
  @IsPositive()
  testTemplateId: number

  @IsInt()
  @IsPositive()
  changeLogId: number
}
