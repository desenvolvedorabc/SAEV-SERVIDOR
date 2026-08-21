import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm'

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  private readonly logger = new Logger(DatabaseConfig.name)

  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions | Promise<TypeOrmModuleOptions> {
    const config = this.configService.get('database')

    if (!config) throw new Error('Failed to create DatabaseConfig')

    if (config.replication) {
      this.logger.log('Database replication is ENABLED')
      this.logger.log(
        `Master: ${config.replication.master.host}:${config.replication.master.port}`,
      )
      this.logger.log(
        `Slaves: ${config.replication.slaves.map((s: any) => `${s.host}:${s.port}`).join(', ')}`,
      )
    } else {
      this.logger.log(
        'Database replication is DISABLED (single connection mode)',
      )
      this.logger.log(`Host: ${config.host}:${config.port}`)
    }

    return config
  }
}
