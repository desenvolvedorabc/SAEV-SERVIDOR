import { IsInt, IsPositive } from 'class-validator'

export class ExecuteBatchOperationDto {
  @IsInt()
  @IsPositive()
  operationId: number
}
