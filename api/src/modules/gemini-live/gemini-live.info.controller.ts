import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiGeminiLiveDocs,
  ApiGeminiLiveInfoDocs,
} from '../../swagger/gemini-live.swagger';

@ApiGeminiLiveDocs()
@Controller('gemini-live')
export class GeminiLiveInfoController {
  constructor(private readonly configService: ConfigService) {}

  @ApiGeminiLiveInfoDocs()
  @Get('info')
  getInfo() {
    const model = this.configService.get<string>(
      'GEMINI_LIVE_MODEL',
      'gemini-2.5-flash-preview-native-audio-dialog',
    );
    const voice = this.configService.get<string>(
      'GEMINI_LIVE_VOICE',
      'Puck',
    );

    return {
      websocketUrl: '/stream/toy',
      authMethod: 'query_param_token',
      audioInput: {
        format: 'pcm_s16le',
        sampleRate: 16000,
        channels: 1,
        frameSize: '512-1024 bytes (~32ms - 64ms)',
      },
      audioOutput: {
        format: 'pcm_s16le',
        sampleRate: 24000,
        channels: 1,
      },
      supportedFunctions: [
        'setAlarm',
        'disableAlarm',
        'clearAllAlarms',
        'sendMessage',
      ],
      model,
      voice,
    };
  }
}
