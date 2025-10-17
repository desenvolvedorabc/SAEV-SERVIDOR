import configuration from '../../config/configuration'

const database = configuration().database

export default {
  ...database,
  // Configuration for TypeORM CLI
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/database/migrations/**/*{.ts,.js}'],
  cli: {
    migrationsDir: 'src/database/migrations',
  },
  // Configuration for typeorm-seeding
  seeds: ['src/database/seeds/*.seed{.ts,.js}'],
  factories: ['src/**/*.factory{.ts,.js}'],
}
