import { IsInt, IsPositive } from 'class-validator'

export class ExecuteTaskDto {
  @IsInt()
  @IsPositive()
  jobId: number
}
