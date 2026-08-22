import { Module } from '@nestjs/common';
import { VoiceController } from './voice.controller';
import { SttService } from './stt.service';
import { TtsService } from './tts.service';
import { AiService } from './ai.service';
import { AiPromptBuilder } from './ai/ai-prompt.builder';
import { AiProviderService } from './ai/ai-provider.service';
import { MessagePlaceholderService } from './message-placeholder.service';
import { DevicesModule } from '../devices/devices.module';
import { AlarmsModule } from '../alarms/alarms.module';
import { ChatsModule } from '../chats/chats.module';
import { UsageModule } from '../usage/usage.module';
import { SseModule } from '../sse/sse.module';
import { AuthModule } from '../auth/auth.module';
import { StreamingSttService } from './streaming/streaming-stt.service';
import { StreamingAiService } from './streaming/streaming-ai.service';
import { StreamingTtsService } from './streaming/streaming-tts.service';
import { VoiceTelemetryService } from './streaming/voice-telemetry.service';
import { VoiceStreamGateway } from './streaming/voice-stream.gateway';

@Module({
  imports: [
    DevicesModule,
    AlarmsModule,
    ChatsModule,
    UsageModule,
    SseModule,
    AuthModule,
  ],
  controllers: [VoiceController],
  providers: [
    SttService,
    TtsService,
    AiService,
    AiPromptBuilder,
    AiProviderService,
    MessagePlaceholderService,
    StreamingSttService,
    StreamingAiService,
    StreamingTtsService,
    VoiceTelemetryService,
    VoiceStreamGateway,
  ],
  exports: [
    SttService,
    TtsService,
    AiService,
    AiPromptBuilder,
    AiProviderService,
    MessagePlaceholderService,
    StreamingSttService,
    StreamingAiService,
    StreamingTtsService,
    VoiceTelemetryService,
    VoiceStreamGateway,
  ],
})
export class VoiceModule {}

