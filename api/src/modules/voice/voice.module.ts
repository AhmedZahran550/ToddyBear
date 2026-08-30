import { Module } from '@nestjs/common';
import { VoiceController } from './voice.controller';
import { TtsService } from './tts.service';
import { AiPromptBuilder } from './ai/ai-prompt.builder';
import { MessagePlaceholderService } from './message-placeholder.service';
import { DevicesModule } from '../devices/devices.module';
import { SseModule } from '../sse/sse.module';

@Module({
  imports: [
    DevicesModule,
    SseModule,
  ],
  controllers: [VoiceController],
  providers: [
    TtsService,
    AiPromptBuilder,
    MessagePlaceholderService,
  ],
  exports: [
    TtsService,
    AiPromptBuilder,
    MessagePlaceholderService,
  ],
})
export class VoiceModule {}
