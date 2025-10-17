import { Student } from 'src/modules/student/model/entities/student.entity'

export class CreateSendTutorMessageDto {
  students: Student[]

  tutorMessageId: number

  forWpp: boolean

  forEmail: boolean
}
