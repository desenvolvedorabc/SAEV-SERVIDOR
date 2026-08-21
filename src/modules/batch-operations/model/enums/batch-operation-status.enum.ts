export enum BatchOperationStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  DONE = 'DONE',
  FAILED = 'FAILED',
}

export enum BatchOperationStatusTag {
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export function toStatusTag(
  status: BatchOperationStatus,
): BatchOperationStatusTag {
  switch (status) {
    case BatchOperationStatus.DONE:
      return BatchOperationStatusTag.SUCCESS
    case BatchOperationStatus.FAILED:
      return BatchOperationStatusTag.ERROR
    default:
      return BatchOperationStatusTag.IN_PROGRESS
  }
}
