import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import WebSocket, { RawData } from 'ws';
import axios from 'axios';

export interface TtsStreamingOptions {
  voiceId?: string;
  modelId?: string;
  sampleRate?: number;
}

@Injectable()
export class StreamingTtsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StreamingTtsService.name);
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private activeContexts = new Map<string, EventEmitter>();
  private contextTimeouts = new Map<string, NodeJS.Timeout>();

  // In-memory LRU-like phrase cache with byte-budget cap (10 MB limit)
  private ttsCache = new Map<string, Buffer>();
  private currentCacheBytes = 0;
  private readonly MAX_CACHE_BYTES = 10 * 1024 * 1024; // 10 MB limit
  private readonly CONTEXT_TIMEOUT_MS = 30_000; // 30s safety timeout for pending TTS contexts

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.initWebSocket();
  }

  onModuleDestroy() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.cleanupAllContexts('Streaming TTS service destroyed');
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.ttsCache.clear();
    this.currentCacheBytes = 0;
  }

  private initWebSocket(): void {
    const apiKey = this.configService.get<string>('CARTESIA_API_KEY');
    if (!apiKey) {
      this.logger.warn('CARTESIA_API_KEY is not configured; Streaming TTS will not connect WS');
      return;
    }

    const url = `wss://api.cartesia.ai/tts/websocket?api_key=${apiKey}&cartesia_version=2026-03-01`;

    try {
      const socket = new WebSocket(url);
      this.ws = socket;

      socket.on('open', () => {
        this.isConnected = true;
        this.logger.log('🔊 Cartesia TTS persistent WebSocket connected and ready');
      });

      socket.on('message', (raw: RawData) => {
        try {
          const msg = JSON.parse(raw.toString());
          const contextId = msg.context_id;
          const emitter = contextId ? this.activeContexts.get(contextId) : null;

          if (msg.type === 'chunk' && msg.data) {
            const pcmBuffer = Buffer.from(msg.data, 'base64');
            if (emitter) {
              emitter.emit('audio_chunk', pcmBuffer);
            }
          } else if (msg.type === 'done') {
            if (emitter) {
              emitter.emit('done');
              this.removeContext(contextId);
            }
          } else if (msg.type === 'error') {
            this.logger.error(`Cartesia WS TTS Error for context ${contextId}: ${msg.error}`);
            if (emitter) {
              emitter.emit('error', new Error(msg.error));
              this.removeContext(contextId);
            }
          }
        } catch (err) {
          this.logger.error(`Failed to parse Cartesia WS message: ${err.message}`);
        }
      });

      socket.on('error', (err) => {
        this.logger.error(`Cartesia TTS WebSocket error: ${err.message}`);
      });

      socket.on('close', () => {
        this.isConnected = false;
        this.logger.warn('Cartesia TTS WebSocket closed. Cleaning up pending contexts and reconnecting in 3s...');
        this.cleanupAllContexts('Cartesia WebSocket closed unexpectedly');
        this.reconnectTimer = setTimeout(() => this.initWebSocket(), 3000);
      });
    } catch (err) {
      this.logger.error(`Failed to initialize Cartesia WS: ${err.message}`);
      this.reconnectTimer = setTimeout(() => this.initWebSocket(), 5000);
    }
  }

  private removeContext(contextId: string): void {
    const timer = this.contextTimeouts.get(contextId);
    if (timer) {
      clearTimeout(timer);
      this.contextTimeouts.delete(contextId);
    }
    this.activeContexts.delete(contextId);
  }

  private cleanupAllContexts(reason: string): void {
    for (const [contextId, emitter] of this.activeContexts.entries()) {
      try {
        emitter.emit('error', new Error(reason));
      } catch {
        // ignore listener errors
      }
      const timer = this.contextTimeouts.get(contextId);
      if (timer) clearTimeout(timer);
    }
    this.activeContexts.clear();
    this.contextTimeouts.clear();
  }

  /**
   * Synthesize a text chunk to speech, streaming PCM audio chunks through the returned EventEmitter.
   */
  synthesizeStream(
    text: string,
    contextId: string,
    options?: TtsStreamingOptions,
    continueStream = false,
  ): EventEmitter {
    const emitter = new EventEmitter();
    const cleanText = text.trim();

    if (!cleanText) {
      process.nextTick(() => emitter.emit('done'));
      return emitter;
    }

    // Check in-memory cache for fixed/repeated phrases
    const cachedAudio = this.ttsCache.get(cleanText);
    if (cachedAudio) {
      this.logger.log(`⚡ TTS Cache hit for: "${cleanText.substring(0, 30)}..." (${cachedAudio.length} bytes)`);
      process.nextTick(() => {
        emitter.emit('audio_chunk', cachedAudio);
        emitter.emit('done');
      });
      return emitter;
    }

    // If WS is connected, use low-latency persistent connection
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.activeContexts.set(contextId, emitter);

      // Register safety timeout to avoid hanging emitters if third-party WS drops message
      const timeout = setTimeout(() => {
        if (this.activeContexts.has(contextId)) {
          this.logger.warn(`⏱️ TTS Context safety timeout (${this.CONTEXT_TIMEOUT_MS}ms) expired for ${contextId}`);
          const activeEmitter = this.activeContexts.get(contextId);
          if (activeEmitter) {
            activeEmitter.emit('done');
          }
          this.removeContext(contextId);
        }
      }, this.CONTEXT_TIMEOUT_MS);
      this.contextTimeouts.set(contextId, timeout);

      const voiceId =
        options?.voiceId ||
        this.configService.get<string>(
          'CARTESIA_VOICE_ID',
          '6ccbfb76-1fc6-48f7-b71d-91ac6298247b',
        );
      const modelId =
        options?.modelId ||
        this.configService.get<string>('CARTESIA_MODEL', 'sonic-3.5');
      const sampleRate = options?.sampleRate || 16000;

      const payload = {
        context_id: contextId,
        model_id: modelId,
        transcript: cleanText,
        voice: { mode: 'id', id: voiceId },
        output_format: {
          container: 'raw',
          encoding: 'pcm_s16le',
          sample_rate: sampleRate,
        },
        continue: continueStream,
      };

      this.ws.send(JSON.stringify(payload));
      return emitter;
    }

    // Fallback: REST HTTP call if WebSocket is unavailable
    this.logger.warn(`Cartesia WS not connected, using REST fallback for: "${cleanText.substring(0, 30)}..."`);
    this.synthesizeRest(cleanText)
      .then((pcmBuffer) => {
        this.cacheAudio(cleanText, pcmBuffer);
        emitter.emit('audio_chunk', pcmBuffer);
        emitter.emit('done');
      })
      .catch((err) => {
        emitter.emit('error', err);
      });

    return emitter;
  }

  private async synthesizeRest(text: string): Promise<Buffer> {
    const apiKey = this.configService.get<string>('CARTESIA_API_KEY');
    const model = this.configService.get<string>('CARTESIA_MODEL', 'sonic-3.5');
    const voiceId = this.configService.get<string>(
      'CARTESIA_VOICE_ID',
      '6ccbfb76-1fc6-48f7-b71d-91ac6298247b',
    );

    if (!apiKey) {
      throw new Error('CARTESIA_API_KEY is not configured');
    }

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
        timeout: 15000,
      },
    );

    return Buffer.from(response.data);
  }

  private cacheAudio(text: string, audio: Buffer): void {
    const audioBytes = audio.length;
    // Don't cache oversized single files
    if (audioBytes > this.MAX_CACHE_BYTES) return;

    // Evict oldest entries until within byte budget
    while (
      this.currentCacheBytes + audioBytes > this.MAX_CACHE_BYTES &&
      this.ttsCache.size > 0
    ) {
      const oldestKey = this.ttsCache.keys().next().value;
      if (oldestKey) {
        const oldBuf = this.ttsCache.get(oldestKey);
        this.currentCacheBytes -= oldBuf?.length || 0;
        this.ttsCache.delete(oldestKey);
      } else {
        break;
      }
    }

    this.ttsCache.set(text, audio);
    this.currentCacheBytes += audioBytes;
  }
}
