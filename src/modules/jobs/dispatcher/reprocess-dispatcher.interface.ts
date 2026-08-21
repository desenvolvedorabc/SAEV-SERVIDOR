export const REPROCESS_DISPATCHER = Symbol('REPROCESS_DISPATCHER')

export interface ReprocessDispatcher {
  scheduleDebounce(testTemplateId: number, changeLogId: number): Promise<void>
  scheduleExecute(jobId: number): Promise<void>
}
