/* eslint-disable n/no-path-concat */
import * as path from 'path'

// Se o host for informado, conecta via TCP (host/port) — usado localmente.
// Caso contrário, conecta via Unix socket (Cloud SQL) — usado em produção.
const buildConnection = ({
  host,
  port,
  username,
  password,
  socket,
}: {
  host?: string
  port?: string
  username?: string
  password?: string
  socket?: string
}) =>
  host
    ? {
        host,
        port: Number(port) || 3306,
        username,
        password,
        database: process.env.DB_NAME,
      }
    : {
        socketPath: socket,
        username,
        password,
        database: process.env.DB_NAME,
      }

const getStandardDatabaseConfig = () =>
  buildConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    socket: process.env.DB_SOCKET,
  })

const getReplicationConfig = () => ({
  replication: {
    master: buildConnection({
      host: process.env.DB_MASTER_HOST || process.env.DB_HOST,
      port: process.env.DB_MASTER_PORT || process.env.DB_PORT,
      username: process.env.DB_MASTER_USERNAME || process.env.DB_USERNAME,
      password: process.env.DB_MASTER_PASSWORD || process.env.DB_PASSWORD,
      socket: process.env.DB_MASTER_SOCKET || process.env.DB_SOCKET,
    }),
    slaves: [
      buildConnection({
        host: process.env.DB_REPLICA_HOST || process.env.DB_HOST,
        port: process.env.DB_REPLICA_PORT || process.env.DB_PORT,
        username: process.env.DB_REPLICA_USERNAME || process.env.DB_USERNAME,
        password: process.env.DB_REPLICA_PASSWORD || process.env.DB_PASSWORD,
        socket: process.env.DB_REPLICA_SOCKET || process.env.DB_SOCKET,
      }),
    ],
  },
})

export default () => {
  // Lido aqui dentro (não no topo do módulo) porque esta função só é chamada
  // pelo ConfigModule.forRoot(), quando o .env já está carregado. No topo do
  // módulo o import roda antes do ConfigModule, e process.env estaria vazio.
  const isReplicationEnabled = process.env.DB_REPLICATION_ENABLED === 'true'

  return {
    port: Number(process.env.DB_PORT) || 3306,
    database: {
      type: 'mysql',
      ...(isReplicationEnabled
        ? getReplicationConfig()
        : getStandardDatabaseConfig()),
      autoLoadEntities: true,
      // Repo aberto: DB_SYNC=true cria o schema via synchronize, permitindo
      // setup em maquina limpa sem depender do historico de migrations.
      migrationsRun:
        process.env.DB_SYNC === 'true'
          ? false
          : process.env.DB_MIGRATIONS_RUN !== 'false',
      synchronize: process.env.DB_SYNC === 'true',
      migrations: [
        path.join(__dirname, '..', '/database/migrations/**/*{.ts,.js}'),
      ],
      logging: process.env.DB_LOGGING !== 'false',
      ssl:
        process.env.NODE_ENV !== 'production'
          ? false
          : {
              rejectUnauthorized: false,
            },
      cli: {
        migrationsDir: __dirname + '/../database/migrations',
      },
      extra: {
        connectionLimit: process.env.DB_CONNECT_LIMIT || 50,
        waitForConnections: process.env.DB_WAIT_FOR_CONNECTIONS == 'true',
        queueLimit: 0, // 0 sem limite
        connectTimeout: 10000, // ms
        // socketPath NÃO vai aqui: o socket/host é resolvido por nó em
        // buildConnection (master/slaves/standard), inclusive com replicação.
      },
    },
  }
}
