import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { InjectConnection } from '@nestjs/typeorm'
import { Connection } from 'typeorm'

@Injectable()
export class DatabaseMonitorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseMonitorService.name)

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  onApplicationBootstrap() {
    this.setupPoolMonitoring()
  }

  private setupPoolMonitoring() {
    const driver = this.connection.driver as any

    // Sem replicação o TypeORM cria driver.pool; com replicação cria
    // driver.poolCluster (mysql2 PoolCluster), cujos nós ficam em _nodes.
    const pools: Array<{ label: string; pool: any }> = []

    if (driver.pool) {
      pools.push({ label: 'MASTER', pool: driver.pool })
    } else if (driver.poolCluster?._nodes) {
      for (const nodeId of Object.keys(driver.poolCluster._nodes)) {
        pools.push({
          label: nodeId,
          pool: driver.poolCluster._nodes[nodeId].pool,
        })
      }
    }

    if (pools.length === 0) {
      this.logger.warn('Pool do MySQL não encontrado no driver atual.')
      return
    }

    this.logger.debug(
      `Iniciando monitoramento do Pool de Conexões (${pools
        .map((p) => p.label)
        .join(', ')})...`,
    )

    for (const { label, pool } of pools) {
      this.monitorPool(label, pool)
    }

    setInterval(() => {
      for (const { label, pool } of pools) {
        this.printStatus(label, pool)
      }
    }, 10000)
  }

  private printStatus(label: string, pool: any) {
    const totalConnections = pool._allConnections?.length || 0
    const freeConnections = pool._freeConnections?.length || 0
    const activeConnections = totalConnections - freeConnections
    const queuedRequests = pool._connectionQueue?.length || 0

    this.logger.debug(
      `Status do Pool [${label}] -> Total: ${totalConnections} | Ativas: ${activeConnections} | Livres: ${freeConnections} | Fila: ${queuedRequests}`,
    )
  }

  private monitorPool(label: string, pool: any) {
    pool.on('enqueue', () => {
      this.logger.warn(
        `[Gargalo][${label}] Limite de conexões atingido! Requisição na fila de espera.`,
      )
      this.printStatus(label, pool)
    })
  }
}
