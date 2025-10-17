import { TypeSchoolEnum } from 'src/modules/school/model/enum/type-school.enum'
import { User } from 'src/modules/user/model/entities/user.entity'

import { TypeMicrodata } from './type-microdata.enum'

export class CreateMicrodatumDto {
  user: User

  countyId: number

  stateId: number

  type: TypeMicrodata

  typeSchool: TypeSchoolEnum

  file: string
}
