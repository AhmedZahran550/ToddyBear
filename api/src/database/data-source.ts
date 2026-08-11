import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.DATABASE_URL;
const useSsl = process.env.DB_SSL === 'true' || !!dbUrl;

export default new DataSource(
  dbUrl
    ? {
        type: 'postgres',
        url: dbUrl,
        ssl: useSsl ? { rejectUnauthorized: false } : false,
        entities: ['src/database/entities/*.entity{.ts,.js}'],
        migrations: ['src/database/migrations/*{.ts,.js}'],
        synchronize: false,
      }
    : {
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'toddybear',
        ssl: useSsl ? { rejectUnauthorized: false } : false,
        entities: ['src/database/entities/*.entity{.ts,.js}'],
        migrations: ['src/database/migrations/*{.ts,.js}'],
        synchronize: false,
      },
);

