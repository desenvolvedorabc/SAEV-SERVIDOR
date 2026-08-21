import { TypeSchoolEnum } from '../../../school/model/enum/type-school.enum'
import {
  BatchOperationStatus,
  BatchOperationStatusTag,
} from '../enums/batch-operation-status.enum'
import { BatchOperationType } from '../enums/batch-operation-type.enum'

export interface BatchOperationCombinationResponse {
  countyId: number
  countyName: string
  network: TypeSchoolEnum
}

export interface BatchOperationResponse {
  id: number
  type: BatchOperationType
  status: BatchOperationStatus
  statusTag: BatchOperationStatusTag
  combinations: BatchOperationCombinationResponse[]
  year: string | null
  errorMessage: string | null
  requestedByUserId: number | null
  requestedByUserName: string | null
  createdAt: Date
  startDate: Date | null
  endDate: Date | null
}
