import { Module } from '@nestjs/common';
import { VoiceController } from './voice.controller';
import { SttService } from './stt.service';
import { TtsService } from './tts.service';
import { AiService } from './ai.service';
import { MessagePlaceholderService } from './message-placeholder.service';
import { DevicesModule } from '../devices/devices.module';
import { AlarmsModule } from '../alarms/alarms.module';
import { ChatsModule } from '../chats/chats.module';
import { UsageModule } from '../usage/usage.module';
import { SseModule } from '../sse/sse.module';

@Module({
  imports: [
    DevicesModule,
    AlarmsModule,
    ChatsModule,
    UsageModule,
    SseModule,
  ],
  controllers: [VoiceController],
  providers: [SttService, TtsService, AiService, MessagePlaceholderService],
  exports: [SttService, TtsService, AiService, MessagePlaceholderService],
})
export class VoiceModule {}

