export const BATCH_OPERATION_DISPATCHER = Symbol('BATCH_OPERATION_DISPATCHER')

export interface BatchOperationDispatcher {
  scheduleExecute(operationId: number): Promise<void>
}
