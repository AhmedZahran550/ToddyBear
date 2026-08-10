import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as FormData from 'form-data';

@Injectable()
export class SttService {
  private readonly logger = new Logger(SttService.name);
  private provider: 'groq' | 'google' = 'groq';

  constructor(private readonly configService: ConfigService) {
    const providerEnv = this.configService.get<string>('STT_PROVIDER', 'groq');
    if (providerEnv === 'google' || providerEnv === 'groq') {
      this.provider = providerEnv;
    }
  }

  getProvider(): string {
    return this.provider;
  }

  setProvider(provider: 'groq' | 'google'): boolean {
    if (provider !== 'groq' && provider !== 'google') {
      return false;
    }
    this.provider = provider;
    this.logger.log(`🔁 STT Provider changed to: ${provider}`);
    return true;
  }

  async speechToText(audioBuffer: Buffer): Promise<string> {
    if (this.provider === 'groq') {
      return this.speechToTextGroq(audioBuffer);
    } else {
      return this.speechToTextGoogle(audioBuffer);
    }
  }

  private async speechToTextGroq(audioBuffer: Buffer): Promise<string> {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      this.logger.error('GROQ_API_KEY is not configured');
      throw new InternalServerErrorException('STT service is not configured');
    }

    try {
      const FormDataClass = (FormData as any).default || FormData;
      const formData = new FormDataClass();
      formData.append('file', audioBuffer, {
        filename: 'audio.wav',
        contentType: 'audio/wav',
      });
      formData.append('model', 'whisper-large-v3-turbo');
      formData.append('language', 'ar');

      const response = await axios.post(
        'https://api.groq.com/openai/v1/audio/transcriptions',
        formData,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            ...formData.getHeaders(),
          },
          timeout: 30000,
        },
      );

      const text = response.data?.text?.trim() || '';
      this.logger.log(`📝 STT (groq) -> ${text}`);
      return text;
    } catch (error) {
      const errMsg =
        error?.response?.data?.error?.message || error?.message || 'STT failed';
      this.logger.error(`❌ Groq STT Error: ${errMsg}`);
      throw new BadRequestException(`Speech recognition failed: ${errMsg}`);
    }
  }

  private async speechToTextGoogle(audioBuffer: Buffer): Promise<string> {
    this.logger.warn('Google STT provider is not yet implemented');
    throw new BadRequestException('Google STT provider is not configured');
  }
}
