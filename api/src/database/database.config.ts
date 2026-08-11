import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';

export const typeOrmAsyncConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const dbUrl = configService.get<string>('DATABASE_URL');
    const sslMode = configService.get<string>('DB_SSL');
    const useSsl = sslMode === 'true' || !!dbUrl;

    if (dbUrl) {
      return {
        type: 'postgres',
        url: dbUrl,
        ssl: useSsl ? { rejectUnauthorized: false } : false,
        entities: [__dirname + '/entities/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        synchronize: false,
        logging: false,
      };
    }

    return {
      type: 'postgres',
      host: configService.get<string>('DB_HOST', 'localhost'),
      port: configService.get<number>('DB_PORT', 5432),
      username: configService.get<string>('DB_USERNAME', 'postgres'),
      password: configService.get<string>('DB_PASSWORD', 'postgres'),
      database: configService.get<string>('DB_NAME', 'toddybear'),
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      entities: [__dirname + '/entities/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      synchronize: false,
      logging: false,
    };
  },
};

