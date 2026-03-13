/* eslint-disable n/no-path-concat */
import * as path from 'path'

export default () => ({
  port: Number(process.env.DB_PORT) || 3306,
  database: {
    type: 'mysql',
    host: process.env.DB_HOST || undefined,
    port: Number(process.env.DB_PORT) || 3306,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    autoLoadEntities: true,
    migrationsRun: process.env.DB_SYNC !== 'true',
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
      connectionLimit: process.env.DB_CONNECTION_LIMIT || 50,
      waitForConnections: process.env.DB_WAIT_FOR_CONNECTIONS == 'true',
      queueLimit: 0, // 0 sem limite
      connectTimeout: 10000, // ms
      socketPath: !process.env.DB_HOST ? process.env.DB_SOCKET : undefined,
    },
  },
})
