import { CloudTasksClient } from '@google-cloud/tasks'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { ReprocessDispatcher } from './reprocess-dispatcher.interface'

interface CloudTasksConfig {
  projectId: string
  location: string
  debounceQueue: string
  executeQueue: string
  workerBaseUrl: string
  serviceAccountEmail: string
  debounceSeconds: number
}

@Injectable()
export class CloudTasksReprocessDispatcher implements ReprocessDispatcher {
  private readonly logger = new Logger(CloudTasksReprocessDispatcher.name)
  private readonly client: CloudTasksClient
  private readonly config: CloudTasksConfig

  constructor(configService: ConfigService) {
    this.config = this.loadConfig(configService)
    this.client = new CloudTasksClient()
  }

  async scheduleDebounce(
    testTemplateId: number,
    changeLogId: number,
  ): Promise<void> {
    const parent = this.client.queuePath(
      this.config.projectId,
      this.config.location,
      this.config.debounceQueue,
    )
    const taskName = `${parent}/tasks/debounce-test-${testTemplateId}`
    const scheduleTime = new Date(
      Date.now() + this.config.debounceSeconds * 1000,
    )

    await this.createTask({
      parent,
      name: taskName,
      url: `${this.config.workerBaseUrl}/internal/reprocess/dispatch`,
      body: { testTemplateId, changeLogId },
      scheduleTime,
    })
  }

  async scheduleExecute(jobId: number): Promise<void> {
    const parent = this.client.queuePath(
      this.config.projectId,
      this.config.location,
      this.config.executeQueue,
    )
    const taskName = `${parent}/tasks/reprocess-job-${jobId}`

    await this.createTask({
      parent,
      name: taskName,
      url: `${this.config.workerBaseUrl}/internal/reprocess/execute`,
      body: { jobId },
    })
  }

  private async createTask(opts: {
    parent: string
    name: string
    url: string
    body: Record<string, unknown>
    scheduleTime?: Date
  }): Promise<void> {
    const payload = Buffer.from(JSON.stringify(opts.body)).toString('base64')

    try {
      await this.client.createTask({
        parent: opts.parent,
        task: {
          name: opts.name,
          scheduleTime: opts.scheduleTime
            ? { seconds: Math.floor(opts.scheduleTime.getTime() / 1000) }
            : undefined,
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
      debounceQueue: required('CLOUD_TASKS_REPROCESS_DEBOUNCE_QUEUE'),
      executeQueue: required('CLOUD_TASKS_REPROCESS_EXECUTE_QUEUE'),
      workerBaseUrl: required('WORKER_BASE_URL'),
      serviceAccountEmail: required('CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL'),
      debounceSeconds: Number(
        configService.get<string>('CLOUD_TASKS_DEBOUNCE_SECONDS') ?? '60',
      ),
    }
  }
}
