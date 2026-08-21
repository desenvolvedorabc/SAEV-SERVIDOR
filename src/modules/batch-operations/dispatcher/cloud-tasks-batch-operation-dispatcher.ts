import { CloudTasksClient } from '@google-cloud/tasks'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { BatchOperationDispatcher } from './batch-operation-dispatcher.interface'

interface CloudTasksConfig {
  projectId: string
  location: string
  executeQueue: string
  workerBaseUrl: string
  serviceAccountEmail: string
}

@Injectable()
export class CloudTasksBatchOperationDispatcher
  implements BatchOperationDispatcher
{
  private readonly logger = new Logger(CloudTasksBatchOperationDispatcher.name)
  private readonly client: CloudTasksClient
  private readonly config: CloudTasksConfig

  constructor(configService: ConfigService) {
    this.config = this.loadConfig(configService)
    this.client = new CloudTasksClient()
  }

  async scheduleExecute(operationId: number): Promise<void> {
    const parent = this.client.queuePath(
      this.config.projectId,
      this.config.location,
      this.config.executeQueue,
    )
    const taskName = `${parent}/tasks/batch-op-${operationId}`

    await this.createTask({
      parent,
      name: taskName,
      url: `${this.config.workerBaseUrl}/internal/batch-operations/execute`,
      body: { operationId },
    })
  }

  private async createTask(opts: {
    parent: string
    name: string
    url: string
    body: Record<string, unknown>
  }): Promise<void> {
    const payload = Buffer.from(JSON.stringify(opts.body)).toString('base64')

    try {
      await this.client.createTask({
        parent: opts.parent,
        task: {
          name: opts.name,
          httpRequest: {
            httpMethod: 'POST',
            url: opts.url,
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            oidcToken: {
              serviceAccountEmail: this.config.serviceAccountEmail,
              audience: this.config.workerBaseUrl,
            },
          },
        },
      })
    } catch (err) {
      const code = (err as { code?: number }).code
      if (code === 6) {
        this.logger.log(
          `Task ${opts.name} already exists; dedup OK (ALREADY_EXISTS)`,
        )
        return
      }
      throw err
    }
  }

  private loadConfig(configService: ConfigService): CloudTasksConfig {
    const required = (key: string): string => {
      const value = configService.get<string>(key)
      if (!value) {
        throw new Error(`Missing required env var ${key}`)
      }
      return value
    }

    return {
      projectId: required('GCP_PROJECT_ID'),
      location: required('CLOUD_TASKS_LOCATION'),
      executeQueue: required('CLOUD_TASKS_BATCH_EXECUTE_QUEUE'),
      workerBaseUrl: required('WORKER_BASE_URL'),
      serviceAccountEmail: required('CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL'),
    }
  }
}
