import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@Injectable()
export class DatabaseMonitorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseMonitorService.name);

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  onApplicationBootstrap() {
    this.setupPoolMonitoring();
  }

  private setupPoolMonitoring() {
    // Acessamos o driver e o pool a partir do objeto Connection
    const pool = (this.connection.driver as any).pool;

    if (!pool) {
      this.logger.warn('Pool do MySQL não encontrado no driver atual.');
      return;
    }

    this.logger.debug('Iniciando monitoramento do Pool de Conexões...');

    const printStatus = () => {
      const totalConnections = pool._allConnections?.length || 0;
      const freeConnections = pool._freeConnections?.length || 0;
      const activeConnections = totalConnections - freeConnections;
      const queuedRequests = pool._connectionQueue?.length || 0;

      this.logger.debug(
        `Status do Pool -> Total: ${totalConnections} | Ativas: ${activeConnections} | Livres: ${freeConnections} | Fila: ${queuedRequests}`
      );
    };

    // 1. Logando via Eventos (Tempo Real)
    pool.on('acquire', (connection: any) => {
      // this.logger.debug(`[Pool] Conexão ${connection.threadId} em uso.`);
      // printStatus();
    });

    pool.on('release', (connection: any) => {
      //this.logger.debug(`[Pool] Conexão ${connection.threadId} devolvida.`);
      // printStatus();
    });

    pool.on('enqueue', () => {
      this.logger.warn('[Gargalo] Limite de conexões atingido! Requisição na fila de espera.');
      printStatus();
    });

    pool.on('connection', (connection: any) => {
      // this.logger.debug(`Nova conexão real criada no banco de dados: ${connection.threadId}`);
      // printStatus();
    });

    setInterval(() => {
      printStatus();
    }, 3000);
  }
}