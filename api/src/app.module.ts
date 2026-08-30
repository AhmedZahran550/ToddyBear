import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { typeOrmAsyncConfig } from './database/database.config';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

import { LogsModule } from './modules/logs/logs.module';
import { OtpModule } from './modules/otp/otp.module';
import { UsersModule } from './modules/users/users.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { AuthModule } from './modules/auth/auth.module';
import { DevicesModule } from './modules/devices/devices.module';
import { AlarmsModule } from './modules/alarms/alarms.module';
import { ChatsModule } from './modules/chats/chats.module';
import { UsageModule } from './modules/usage/usage.module';
import { SseModule } from './modules/sse/sse.module';
import { VoiceModule } from './modules/voice/voice.module';
import { GeminiLiveModule } from './modules/gemini-live/gemini-live.module';
import { CloudStorageModule } from './modules/cloud-storage/cloud-storage.module';
import { RingtonesModule } from './modules/ringtones/ringtones.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { DBExceptionFilter } from './common/filters/query-failed-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync(typeOrmAsyncConfig),
    ScheduleModule.forRoot(),
    CloudStorageModule,
    RingtonesModule,
    LogsModule,
    OtpModule,
    UsersModule,
    EmployeesModule,
    AuthModule,
    DevicesModule,
    AlarmsModule,
    ChatsModule,
    UsageModule,
    SseModule,
    VoiceModule,
    GeminiLiveModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    GlobalExceptionFilter,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: DBExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
