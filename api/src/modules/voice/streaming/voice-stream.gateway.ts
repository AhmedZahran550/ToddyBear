import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IncomingMessage } from 'http';
import WebSocket, { RawData, Server as WsServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { StreamingSttService, StreamingSttSession } from './streaming-stt.service';
import { StreamingAiService } from './streaming-ai.service';
import { StreamingTtsService } from './streaming-tts.service';
import { VoiceTelemetryService } from './voice-telemetry.service';
import { AlarmsService } from '../../alarms/alarms.service';
import { MessagePlaceholderService } from '../message-placeholder.service';
import { DevicesService } from '../../devices/devices.service';

interface AuthenticatedWebSocket extends WebSocket {
  device?: any;
  sttSession?: StreamingSttSession | null;
  currentSessionId?: string | null;
  isProcessingAi?: boolean;
  pipelineTriggered?: boolean;
  abortController?: AbortController | null;
  audioStopTimeout?: NodeJS.Timeout | null;
  language?: string;
}

@WebSocketGateway({
  path: '/voice-stream',
})
export class VoiceStreamGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: WsServer;

  private readonly logger = new Logger(VoiceStreamGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly streamingSttService: StreamingSttService,
    private readonly streamingAiService: StreamingAiService,
    private readonly streamingTtsService: StreamingTtsService,
    private readonly telemetryService: VoiceTelemetryService,
    private readonly alarmsService: AlarmsService,
    private readonly messagePlaceholderService: MessagePlaceholderService,
    private readonly devicesService: DevicesService,
  ) {}

  afterInit() {
    this.logger.log('🚀 VoiceStreamGateway initialized on path: /voice-stream');
  }

  async handleConnection(client: AuthenticatedWebSocket, request: IncomingMessage) {
    try {
      const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      const tokenFromQuery = url.searchParams.get('token');
      const authHeader = request.headers['authorization'];
      const tokenFromHeader = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;

      const token = tokenFromQuery || tokenFromHeader;

      if (!token) {
        this.logger.warn('❌ WebSocket connection rejected: Missing JWT token');
        this.sendJson(client, { event: 'error', message: 'Missing authentication token' });
        client.close(4001, 'Unauthorized');
        return;
      }

      const payload = this.jwtService.verify(token);
      if (!payload || payload.type !== 'device') {
        this.logger.warn('❌ WebSocket connection rejected: Token is not a valid device token');
        this.sendJson(client, { event: 'error', message: 'Invalid device credentials' });
        client.close(4003, 'Forbidden');
        return;
      }

      client.device = payload;
      client.sttSession = null;
      client.currentSessionId = null;
      client.isProcessingAi = false;
      client.pipelineTriggered = false;
      client.abortController = null;
      client.audioStopTimeout = null;

      // Update online status in background
      if (payload.macAddress) {
        this.devicesService.setOnlineStatus(payload.macAddress, true).catch(() => {});
      }

      this.logger.log(
        `🔌 Device connected to voice stream: ${payload.deviceName || payload.sub} (MAC: ${payload.macAddress || 'unknown'})`,
      );

      this.sendJson(client, {
        event: 'connection_ready',
        message: 'Connected to ToddyBear Voice Streaming Pipeline',
        device: {
          id: payload.sub,
          name: payload.deviceName,
          userName: payload.userName,
        },
      });

      // Bind raw message listener
      client.on('message', (data: RawData, isBinary: boolean) => {
        this.handleClientMessage(client, data, isBinary);
      });
    } catch (err) {
      this.logger.error(`❌ WebSocket connection error: ${err.message}`);
      this.sendJson(client, { event: 'error', message: 'Authentication failed' });
      client.close(4001, 'Unauthorized');
    }
  }

  handleDisconnect(client: AuthenticatedWebSocket) {
    if (client.device) {
      this.logger.log(
        `🔌 Device disconnected: ${client.device.deviceName || client.device.sub}`,
      );
      if (client.device.macAddress) {
        this.devicesService.setOnlineStatus(client.device.macAddress, false).catch(() => {});
      }
    }

    if (client.audioStopTimeout) {
      clearTimeout(client.audioStopTimeout);
      client.audioStopTimeout = null;
    }

    if (client.abortController) {
      client.abortController.abort();
      client.abortController = null;
    }

    if (client.sttSession) {
      client.sttSession.close();
      client.sttSession = null;
    }

    if (client.currentSessionId) {
      this.telemetryService.endSession(client.currentSessionId);
      client.currentSessionId = null;
    }
  }

  private handleClientMessage(
    client: AuthenticatedWebSocket,
    data: RawData,
    isBinary: boolean,
  ) {
    if (isBinary) {
      // Binary PCM audio chunk from microphone
      if (client.sttSession) {
        client.sttSession.sendAudio(data as Buffer);
      }
      return;
    }

    // JSON control messages
    try {
      const msg = JSON.parse(data.toString());
      const event = msg.event;

      switch (event) {
        case 'audio_start':
          this.handleAudioStart(client, msg);
          break;

        case 'audio_stop':
          this.handleAudioStop(client);
          break;

        case 'ping':
          this.sendJson(client, { event: 'pong', timestamp: Date.now() });
          break;

        default:
          this.logger.warn(`Unknown WS event received: ${event}`);
      }
    } catch (err) {
      this.logger.error(`Failed to parse client message: ${err.message}`);
    }
  }

  private handleAudioStart(client: AuthenticatedWebSocket, msg: any) {
    // Concurrency guard: reject if AI is already processing a response for this socket
    if (client.isProcessingAi) {
      this.logger.warn(`⚠️ audio_start ignored: Socket is currently processing AI response`);
      this.sendJson(client, {
        event: 'busy',
        message: 'AI response is currently being synthesized. Please wait.',
      });
      return;
    }

    // Clear any pending audio_stop timer
    if (client.audioStopTimeout) {
      clearTimeout(client.audioStopTimeout);
      client.audioStopTimeout = null;
    }

    // Abort previous in-flight operations if any
    if (client.abortController) {
      client.abortController.abort();
    }
    client.abortController = new AbortController();

    // Close existing STT session if any
    if (client.sttSession) {
      client.sttSession.close();
      client.sttSession = null;
    }

    const sessionId = uuidv4();
    client.currentSessionId = sessionId;
    client.isProcessingAi = false;
    client.pipelineTriggered = false;
    client.language = msg.language || 'ar';

    this.telemetryService.startSession(
      sessionId,
      client.device?.sub,
      client.device?.userId,
    );

    try {
      const sttSession = this.streamingSttService.createSession({
        language: msg.language || 'ar',
        sampleRate: msg.sampleRate || 16000,
      });

      client.sttSession = sttSession;

      sttSession.on('partial', (partialText, fullText) => {
        this.telemetryService.markSttPartial(sessionId);
        this.sendJson(client, {
          event: 'transcript',
          text: fullText || partialText,
          isFinal: false,
        });
      });

      sttSession.on('final', (finalChunk, fullText) => {
        this.sendJson(client, {
          event: 'transcript',
          text: fullText || finalChunk,
          isFinal: true,
        });
      });

      sttSession.on('utterance_end', (fullTranscript) => {
        if (!client.pipelineTriggered && fullTranscript.trim().length > 0) {
          client.pipelineTriggered = true;
          this.processAiAndTtsPipeline(client, fullTranscript, sessionId);
        }
      });

      sttSession.on('error', (err) => {
        this.logger.error(`STT Session error: ${err.message}`);
        this.sendJson(client, {
          event: 'error',
          stage: 'stt',
          message: 'Speech recognition error',
        });
      });

      this.sendJson(client, {
        event: 'audio_started',
        sessionId,
        sampleRate: 16000,
        encoding: 'pcm_s16le',
      });
    } catch (err) {
      this.logger.error(`Failed to create STT session: ${err.message}`);
      this.sendJson(client, {
        event: 'error',
        stage: 'stt',
        message: 'Could not initialize STT session',
      });
    }
  }

  private handleAudioStop(client: AuthenticatedWebSocket) {
    if (!client.sttSession) return;

    const sessionId = client.currentSessionId || uuidv4();
    const sttSession = client.sttSession;

    sttSession.finalize();

    if (client.audioStopTimeout) {
      clearTimeout(client.audioStopTimeout);
    }

    // Give Deepgram 400ms to return final transcripts if utterance_end didn't fire yet
    client.audioStopTimeout = setTimeout(() => {
      client.audioStopTimeout = null;

      // Disconnect safety check
      if (client.readyState !== WebSocket.OPEN) return;

      if (!client.pipelineTriggered) {
        const fullTranscript = sttSession.getFullTranscript();
        if (fullTranscript.trim().length > 0) {
          client.pipelineTriggered = true;
          this.processAiAndTtsPipeline(client, fullTranscript, sessionId);
        } else {
          this.sendJson(client, { event: 'silence_detected' });
          if (client.currentSessionId) {
            this.telemetryService.endSession(client.currentSessionId);
          }
        }
      }
    }, 400);
  }

  private async processAiAndTtsPipeline(
    client: AuthenticatedWebSocket,
    userText: string,
    sessionId: string,
  ) {
    if (client.isProcessingAi) return;
    client.isProcessingAi = true;

    this.telemetryService.markSttFinal(sessionId, userText);
    this.sendJson(client, { event: 'ai_thinking', transcript: userText });

    const device = client.device;
    const userId = device?.userId;
    const deviceId = device?.sub;

    const userPayload = {
      ...device,
      id: userId,
      deviceName: device?.deviceName || device?.name,
    };

    try {
      this.telemetryService.markLlmStart(sessionId);

      const aiStream = this.streamingAiService.askAiStream(
        deviceId,
        userText,
        userPayload,
        () => this.telemetryService.markLlmFirstToken(sessionId),
        client.abortController?.signal,
      );

      let firstSentenceReceived = false;
      const ttsPromises: Promise<void>[] = [];

      for await (const aiEvent of aiStream) {
        // Abort guard if socket closed or cancelled mid-stream
        if (client.readyState !== WebSocket.OPEN || client.abortController?.signal.aborted) {
          this.logger.log(`Pipeline aborted for session ${sessionId}`);
          break;
        }

        if (aiEvent.type === 'sentence') {
          const sentence = aiEvent.text;
          const sentenceIdx = aiEvent.index;

          if (!firstSentenceReceived) {
            firstSentenceReceived = true;
            this.telemetryService.markTtsFirstChunkStart(sessionId);
            this.sendJson(client, {
              event: 'audio_response_start',
              sampleRate: 16000,
              encoding: 'pcm_s16le',
              format: 'raw_pcm',
            });
          }

          this.sendJson(client, {
            event: 'ai_response_chunk',
            text: sentence,
            index: sentenceIdx,
          });

          // Synthesize sentence via Cartesia streaming WebSocket
          const ttsPromise = this.streamSentenceAudio(
            client,
            sentence,
            `${sessionId}-${sentenceIdx}`,
            sessionId,
          );
          ttsPromises.push(ttsPromise);
          await ttsPromise; // Sequentially stream audio so device plays sentences in order
        } else if (aiEvent.type === 'complete') {
          this.telemetryService.markLlmEnd(sessionId);
          // Handle structured actions (alarms, messages) in background
          this.handleAiSideEffects(aiEvent.response, device, userId).catch((err) =>
            this.logger.error(`Side effect handling error: ${err.message}`),
          );
        }
      }

      await Promise.all(ttsPromises);

      // Signal completion to device if socket is still open
      if (client.readyState === WebSocket.OPEN && !client.abortController?.signal.aborted) {
        this.sendJson(client, { event: 'audio_response_end' });
      }
      this.telemetryService.markTtsEnd(sessionId);
    } catch (err) {
      if (!client.abortController?.signal.aborted) {
        this.logger.error(`Pipeline execution failed: ${err.message}`);
        this.sendJson(client, {
          event: 'error',
          stage: 'pipeline',
          message: 'AI assistant pipeline failure',
        });
      }
    } finally {
      this.telemetryService.endSession(sessionId);
      client.isProcessingAi = false;
      client.pipelineTriggered = false;
      if (client.sttSession) {
        client.sttSession.close();
        client.sttSession = null;
      }
    }
  }

  private streamSentenceAudio(
    client: AuthenticatedWebSocket,
    sentenceText: string,
    contextId: string,
    sessionId: string,
  ): Promise<void> {
    return new Promise((resolve) => {
      const ttsEmitter = this.streamingTtsService.synthesizeStream(
        sentenceText,
        contextId,
        { language: client.language || 'ar' },
      );

      ttsEmitter.on('audio_chunk', (chunk: Buffer) => {
        if (client.readyState === WebSocket.OPEN) {
          this.telemetryService.markTtsFirstByteSent(sessionId);
          client.send(chunk, { binary: true });
        }
      });

      ttsEmitter.on('done', () => resolve());

      ttsEmitter.on('error', (err) => {
        this.logger.error(`TTS Stream error: ${err.message}`);
        resolve(); // Continue gracefully for subsequent sentences
      });
    });
  }

  private async handleAiSideEffects(aiResponse: any, device: any, userId: string) {
    if (!aiResponse || !userId) return;

    // 1. Clear all alarms if requested
    if (aiResponse.clearAllAlarms) {
      try {
        const count = await this.alarmsService.deleteAllByUser(userId);
        this.logger.log(`🗑️ All alarms cleared via streaming AI for user ${userId} (${count} deleted)`);
      } catch (err) {
        this.logger.error(`Failed to clear all alarms: ${err.message}`);
      }
    }

    // 2. Alarm set / disable actions
    if (aiResponse.alarms && aiResponse.alarms.length > 0) {
      for (const alarm of aiResponse.alarms) {
        try {
          if (alarm.action === 'set') {
            await this.alarmsService.create({
              userId,
              time: alarm.time,
              label: alarm.label || undefined,
              deviceId: device?.sub || undefined,
              enabled: true,
            });
            this.logger.log(`⏰ Alarm set via streaming AI for user ${userId} at ${alarm.time}`);
          } else if (alarm.action === 'disable') {
            const count = await this.alarmsService.disableByTime(userId, alarm.time);
            this.logger.log(`🔕 Alarm disabled via streaming AI for user ${userId} at ${alarm.time} (${count} affected)`);
          }
        } catch (err) {
          this.logger.error(`Failed to handle alarm action ${alarm.action}: ${err.message}`);
        }
      }
    }

    // 3. Send message flag
    if (aiResponse.sendMessage) {
      try {
        await this.messagePlaceholderService.sendMessage({
          userId,
          recipient: aiResponse.messageTo,
          content: aiResponse.messageContent,
        });
      } catch (err) {
        this.logger.error(`Failed to process send message flag: ${err.message}`);
      }
    }
  }

  private sendJson(client: WebSocket, payload: any): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload));
    }
  }
}
