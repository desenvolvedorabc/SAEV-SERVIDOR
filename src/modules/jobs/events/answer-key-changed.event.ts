export const ANSWER_KEY_CHANGED_EVENT = 'answer-key.changed'

export class AnswerKeyChangedEvent {
  constructor(
    public readonly testTemplateId: number,
    public readonly changeLogId: number,
  ) {}
}
