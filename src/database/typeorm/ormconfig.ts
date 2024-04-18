/* eslint-disable @typescript-eslint/no-var-requires */
import { TypeOrmModuleOptions } from "@nestjs/typeorm";

require("dotenv").config();

export const ormConfig = {
  type: "mysql",
  host: process.env.DB_HOST || undefined,
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  autoLoadEntities: true,
  entities: ["dist/**/*.entity.js"],
  migrationsRun: true,
  migrations: ["dist/src/database/migrations/*.js"],
  cli: {
    migrationsDir: "src/database/migrations",
  },
  factories: ["dist/**/database/factories/**/*.js"],
  seeds: ["dist/**/database/seeds/**/*.js"],
  ssl:
    process.env.NODE_ENV != "production"
      ? false
      : {
          rejectUnauthorized: false,
        },
  logging: process.env.DB_LOGGING == "true",
  extra: {
    connectionLimit: 50,
    socketPath: !process.env.DB_HOST ? process.env.DB_SOCKET : undefined
  },
} as TypeOrmModuleOptions;
