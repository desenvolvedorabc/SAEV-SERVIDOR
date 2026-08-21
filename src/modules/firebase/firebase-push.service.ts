import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import * as admin from 'firebase-admin'
import { PushNotificationService } from 'src/modules/push-notification/push-notification.service'
import { ResponsibleDevice } from 'src/modules/responsibles/entities/responsible-device.entity'
import { Repository } from 'typeorm'

@Injectable()
export class FirebasePushService
  extends PushNotificationService
  implements OnModuleInit
{
  private readonly logger = new Logger(FirebasePushService.name)

  constructor(
    @InjectRepository(ResponsibleDevice)
    private readonly deviceRepository: Repository<ResponsibleDevice>,
  ) {
    super()
  }

  onModuleInit() {
    if (admin.apps.length === 0) {
      const projectId = process.env.FIREBASE_PROJECT_ID
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

      if (projectId && clientEmail && privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        })
        this.logger.log('Firebase Admin inicializado com sucesso')
      } else {
        this.logger.warn(
          'Credenciais do Firebase nao configuradas. Push notifications desabilitadas.',
        )
      }
    }
  }

  async sendToResponsible(
    responsibleId: number,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    try {
      if (admin.apps.length === 0) {
        this.logger.warn('Firebase nao inicializado, push nao enviado')
        return
      }

      const device = await this.deviceRepository.findOne({
        where: { responsibleId, active: true },
      })

      if (!device) {
        return
      }

      const message: admin.messaging.Message = {
        token: device.pushToken,
        notification: { title, body },
        data: data
          ? Object.fromEntries(
              Object.entries(data).map(([k, v]) => [k, String(v)]),
            )
          : undefined,
      }

      await admin.messaging().send(message)
    } catch (error) {
      const errorCode = (error as any)?.code

      if (
        errorCode === 'messaging/invalid-registration-token' ||
        errorCode === 'messaging/registration-token-not-registered'
      ) {
        await this.deviceRepository.update(
          { responsibleId, active: true },
          { active: false },
        )
        this.logger.warn(
          `Token desativado (${errorCode}) para responsavel ${responsibleId}`,
        )
      } else {
        this.logger.error(
          `Erro ao enviar push para responsavel ${responsibleId}:`,
          error,
        )
      }
    }
  }
}
