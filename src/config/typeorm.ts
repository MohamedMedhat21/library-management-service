import { registerAs } from '@nestjs/config';
import { config as dotenvConfig } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

dotenvConfig({ path: '.env' });

const config = {
  type: 'mysql',
  host: process.env.DATABASE_HOST,
  port: +(process.env.DATABASE_PORT || 3306),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['dist/infrastructure/database/migrations/*{.ts,.js}'],
  autoLoadEntities: true,
  synchronize: false,
  extra: {
    idleTimeout: 50000,
  },
  bigNumberStrings: false,
};

export default registerAs('typeorm', () => config);
export const connectionSource = new DataSource(config as DataSourceOptions);
