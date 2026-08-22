import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import WebSocket, { RawData } from 'ws';

export interface SttSessionOptions {
  language?: string;
  sampleRate?: number;
  model?: string;
  endpointing?: number;
}

export class StreamingSttSession extends EventEmitter {
  private ws: WebSocket | null = null;
  private isAlive = false;
  private pingInterval: NodeJS.Timeout | null = null;
  private accumulatedFinalText = '';
  private lastPartialText = '';
  private isClosed = false;

  constructor(
    private readonly apiKey: string,
    private readonly options: SttSessionOptions,
    private readonly logger: Logger,
  ) {
    super();
    this.setMaxListeners(20);
    this.connect();
  }

  private connect(): void {
    const model = this.options.model || 'nova-3';
    const language = this.options.language || 'ar';
    const sampleRate = this.options.sampleRate || 16000;
    const endpointing = this.options.endpointing || 300;

    const params = new URLSearchParams({
      model,
      language,
      encoding: 'linear16',
      sample_rate: String(sampleRate),
      endpointing: String(endpointing),
      interim_results: 'true',
      smart_format: 'true',
      utterance_end_ms: '1000',
      vad_events: 'true',
    });

    const url = `wss://api.deepgram.com/v1/listen?${params.toString()}`;

    try {
      const socket = new WebSocket(url, {
        headers: {
          Authorization: `Token ${this.apiKey}`,
        },
      });
      this.ws = socket;

      socket.on('open', () => {
        this.isAlive = true;
        this.logger.log(`🎙️ Deepgram STT WebSocket connected (model: ${model}, lang: ${language})`);
        this.emit('ready');

        // Keep-alive timer
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'KeepAlive' }));
          }
        }, 8000);
      });

      socket.on('message', (data: RawData) => {
        try {
          const msg = JSON.parse(data.toString());

          if (msg.type === 'Results') {
            const transcript =
              msg.channel?.alternatives?.[0]?.transcript?.trim() || '';
            const isFinal = Boolean(msg.is_final);
            const speechFinal = Boolean(msg.speech_final);

            if (transcript.length > 0) {
              if (isFinal) {
                this.accumulatedFinalText = this.accumulatedFinalText
                  ? `${this.accumulatedFinalText} ${transcript}`
                  : transcript;
                this.lastPartialText = ''; // Clear partial text so it doesn't duplicate
                this.emit('final', transcript, this.accumulatedFinalText);
              } else {
                this.lastPartialText = transcript;
                this.emit('partial', transcript, this.getFullTranscript());
              }
            }

            if (speechFinal && (this.accumulatedFinalText || this.lastPartialText)) {
              this.lastPartialText = '';
              const fullText = this.getFullTranscript();
              this.logger.log(`📝 STT speech_final detected -> "${fullText}"`);
              this.emit('utterance_end', fullText);
            }
          } else if (msg.type === 'UtteranceEnd') {
            this.lastPartialText = '';
            const fullText = this.getFullTranscript();
            if (fullText.length > 0) {
              this.logger.log(`📝 STT UtteranceEnd event -> "${fullText}"`);
              this.emit('utterance_end', fullText);
            }
          }
        } catch (err) {
          this.logger.error(`Error parsing Deepgram message: ${err.message}`);
        }
      });

      socket.on('error', (err) => {
        this.logger.error(`Deepgram STT WebSocket error: ${err.message}`);
        this.emit('error', err);
      });

      socket.on('close', (code, reason) => {
        this.isAlive = false;
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }
        if (!this.isClosed) {
          this.emit('close', code, reason.toString());
        }
      });
    } catch (err) {
      this.logger.error(`Failed to initialize Deepgram WebSocket: ${err.message}`);
      this.emit('error', err);
    }
  }

  sendAudio(chunk: Buffer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(chunk);
    }
  }

  getFullTranscript(): string {
    if (this.accumulatedFinalText && this.lastPartialText) {
      return `${this.accumulatedFinalText} ${this.lastPartialText}`.trim();
    }
    return (this.accumulatedFinalText || this.lastPartialText).trim();
  }

  finalize(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'Finalize' }));
      } catch (err) {
        this.logger.warn(`Failed to send Finalize to Deepgram: ${err.message}`);
      }
    }
  }

  close(): void {
    this.isClosed = true;
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    const currentWs = this.ws;
    this.ws = null;
    if (currentWs) {
      try {
        if (currentWs.readyState === WebSocket.OPEN) {
          currentWs.send(JSON.stringify({ type: 'CloseStream' }));
        }
        currentWs.close();
      } catch (err) {
        // ignore close error
      }
    }
    this.accumulatedFinalText = '';
    this.lastPartialText = '';
    this.removeAllListeners();
  }
}

@Injectable()
export class StreamingSttService {
  private readonly logger = new Logger(StreamingSttService.name);

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.configService.get<string>('DEEPGRAM_API_KEY'));
  }

  createSession(options?: SttSessionOptions): StreamingSttSession {
    const apiKey = this.configService.get<string>('DEEPGRAM_API_KEY');
    if (!apiKey) {
      throw new Error('DEEPGRAM_API_KEY is not configured');
    }

    const defaultModel = this.configService.get<string>('DEEPGRAM_MODEL', 'nova-3');
    const defaultLanguage = this.configService.get<string>('DEEPGRAM_LANGUAGE', 'ar');

    return new StreamingSttSession(
      apiKey,
      {
        model: options?.model || defaultModel,
        language: options?.language || defaultLanguage,
        sampleRate: options?.sampleRate || 16000,
        endpointing: options?.endpointing || 300,
      },
      this.logger,
    );
  }
}
