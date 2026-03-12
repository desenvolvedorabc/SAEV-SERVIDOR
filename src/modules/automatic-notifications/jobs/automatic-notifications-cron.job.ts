import { Injectable, Logger } from '@nestjs/common'

import { NotificationRuleType } from '../entities/notification-rule.entity'
import { AutomaticNotificationSendService } from '../services/automatic-notification-send.service'
import { NotificationRulesService } from '../services/notification-rules.service'

@Injectable()
export class AutomaticNotificationsCronJob {
  private readonly logger = new Logger(AutomaticNotificationsCronJob.name)

  constructor(
    private readonly notificationRulesService: NotificationRulesService,
    private readonly automaticNotificationService: AutomaticNotificationSendService,
  ) {}

  async processAutomaticNotificationsPerformance(): Promise<void> {
    this.logger.log(
      'Iniciando processamento de notificações automáticas de rendimento',
    )

    await this.processAutomaticNotifications(
      NotificationRuleType.BAIXO_RENDIMENTO,
    )
  }

  async processAutomaticNotificationsFouls(): Promise<void> {
    this.logger.log(
      'Iniciando processamento de notificações automáticas de rendimento',
    )

    await this.processAutomaticNotifications(
      NotificationRuleType.EXCESSO_FALTAS,
    )
  }

  async processAutomaticNotificationsResults(): Promise<void> {
    this.logger.log(
      'Iniciando processamento de notificações automáticas de faltas',
    )

    await this.processAutomaticNotifications(
      NotificationRuleType.RESULTADO_TESTE,
    )
  }

  private async processAutomaticNotifications(typeRule: NotificationRuleType) {
    try {
      const activeRules =
        await this.notificationRulesService.findActiveRulesByTypeRule(typeRule)

      if (activeRules.length === 0) {
        this.logger.log('Nenhuma regra ativa encontrada')
        return
      }

      for (const rule of activeRules) {
        try {
          await this.automaticNotificationService.processRule(rule)
        } catch (error) {
          this.logger.error(`Erro ao processar regra ${rule.id}:`, error)
        }
      }

      this.logger.log('Processamento de notificações automáticas concluído')
    } catch (error) {
      this.logger.error(
        'Erro no processamento de notificações automáticas:',
        error,
      )
    }
  }
}
