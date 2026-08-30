import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GeminiLiveGateway } from './gemini-live.gateway';
import { GeminiLiveRelayService } from './gemini-live-relay.service';
import { GeminiLiveSessionManager } from './gemini-live-session.manager';
import { GeminiLiveFunctionHandlerService } from './gemini-live-function-handler.service';
import { GeminiLiveInfoController } from './gemini-live.info.controller';
import { DevicesModule } from '../devices/devices.module';
import { AlarmsModule } from '../alarms/alarms.module';
import { ChatsModule } from '../chats/chats.module';
import { VoiceModule } from '../voice/voice.module';
import { AiPromptBuilder } from '../voice/ai/ai-prompt.builder';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'super-secret-jwt-key'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRATION', '7d') as any,
        },
      }),
    }),
    DevicesModule,
    AlarmsModule,
    ChatsModule,
    VoiceModule,
  ],
  controllers: [GeminiLiveInfoController],
  providers: [
    GeminiLiveGateway,
    GeminiLiveRelayService,
    GeminiLiveSessionManager,
    GeminiLiveFunctionHandlerService,
    AiPromptBuilder,
  ],
  exports: [
    GeminiLiveGateway,
    GeminiLiveRelayService,
    GeminiLiveSessionManager,
    GeminiLiveFunctionHandlerService,
  ],
})
export class GeminiLiveModule {}
