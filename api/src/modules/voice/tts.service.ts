import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);

  constructor(private readonly configService: ConfigService) {}

  async textToSpeech(text: string): Promise<Buffer> {
    const apiKey = this.configService.get<string>('CARTESIA_API_KEY');
    const model = this.configService.get<string>('CARTESIA_MODEL', 'sonic-3.5');
    const voiceId = this.configService.get<string>(
      'CARTESIA_VOICE_ID',
      '6ccbfb76-1fc6-48f7-b71d-91ac6298247b',
    );

    if (!apiKey) {
      this.logger.error('CARTESIA_API_KEY is not configured');
      return Buffer.alloc(0);
    }

    try {
      const response = await axios.post(
        'https://api.cartesia.ai/tts/bytes',
        {
          model_id: model,
          transcript: text,
          voice: { mode: 'id', id: voiceId },
          output_format: {
            container: 'raw',
            encoding: 'pcm_s16le',
            sample_rate: 16000,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Cartesia-Version': '2026-03-01',
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
          timeout: 30000,
        },
      );

      const buffer = Buffer.from(response.data);
      this.logger.log(`🔊 TTS generated -> ${buffer.length} bytes for text: "${text.substring(0, 30)}..."`);
      return buffer;
    } catch (error) {
      this.logger.error(`❌ Cartesia TTS Error: ${error?.response?.data || error?.message}`);
      return Buffer.alloc(0);
    }
  }
}
