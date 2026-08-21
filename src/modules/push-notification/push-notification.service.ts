import { Injectable } from '@nestjs/common'

@Injectable()
export abstract class PushNotificationService {
  abstract sendToResponsible(
    responsibleId: number,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void>
}
