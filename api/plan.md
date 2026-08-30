# Migration Plan: STT ➔ LLM ➔ TTS to Gemini Multimodal Live API

## Overview
This plan details the full replacement of the traditional sequential **STT ➔ LLM ➔ TTS** pipeline with a native, bidirectional **Gemini Multimodal Live API** streaming pipeline in a NestJS backend connected to a smart toy (ESP32).

---

## 1. Architecture Transition

### Previous Sequential Pipeline
```
[Toy (ESP32)] ──(Audio File/Chunk)──> [STT] ──(Text)──> [LLM] ──(Text)──> [TTS] ──(Audio)──> [Toy (ESP32)]
```
* **Latency:** ~1.5s – 3.0s
* **Issues:** High latency, rigid turn-taking, complex interruption handling.

### New Real-Time Live Architecture
```
┌──────────────┐                     ┌────────────────────────┐                     ┌────────────────────────┐
│  Smart Toy   │   Raw PCM Stream    │     NestJS Backend     │   Bidi WebSocket    │  Gemini Multimodal     │
│  (ESP32-S3)  │ ══════════════════> │    (Streaming Proxy)   │ ══════════════════> │       Live API         │
│              │ <══════════════════ │                        │ <══════════════════ │                        │
└──────────────┘   Speaker Audio     └────────────────────────┘   Audio/Tool Chunks └────────────────────────┘
```
* **Latency:** ~300ms – 600ms
* **Benefits:** Real-time bi-directional streaming, native speech barge-in/interruptions, integrated function calling.

---

## 2. Audio Specifications

| Parameter | Toy to Server (Microphone) | Server to Toy (Speaker) |
| :--- | :--- | :--- |
| **Format** | Linear PCM, 16-bit, Little-Endian, Mono | Linear PCM, 16-bit, Little-Endian, Mono |
| **Sample Rate** | 16,000 Hz | 24,000 Hz |
| **Frame Size** | 512 – 1024 bytes (~32ms – 64ms) | Streamed as received in base64/binary |
| **Transport** | WebSocket Binary Frame | WebSocket Binary Frame |

---

## 3. NestJS Implementation

### Step 1: Install Dependencies
```bash
npm install ws
npm install --save-dev @types/ws
```

### Step 2: Gemini Live Relay Service (`src/gemini-live/gemini-live-relay.service.ts`)
```typescript
import { Injectable, Logger } from '@nestjs/common';
import WebSocket from 'ws';

@Injectable()
export class GeminiLiveRelayService {
  private readonly logger = new Logger(GeminiLiveRelayService.name);
  private readonly HOST = 'generativelanguage.googleapis.com';
  private readonly PATH =
    '/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';

  createGeminiLiveSession(apiKey: string): WebSocket {
    const wsUrl = `wss://${this.HOST}${this.PATH}?key=${apiKey}`;
    const geminiWs = new WebSocket(wsUrl);

    geminiWs.on('open', () => {
      this.logger.log('Connected to Gemini Multimodal Live API');
      this.sendHandshakeSetup(geminiWs);
    });

    return geminiWs;
  }

  private sendHandshakeSetup(ws: WebSocket) {
    const setupFrame = {
      setup: {
        model: 'models/gemini-2.0-flash-exp',
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Puck', // 'Puck' | 'Aoede' | 'Charon' | 'Fenrir' | 'Kore'
              },
            },
          },
        },
        systemInstruction: {
          parts: [
            {
              text: 'You are a warm, playful, and caring smart teddy bear for kids. Keep replies short, lively, and age-appropriate.',
            },
          ],
        },
        tools: [
          {
            functionDeclarations: [
              {
                name: 'playStoryOrLullaby',
                description: 'Plays a story or lullaby track for the child',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    trackType: { type: 'STRING', enum: ['STORY', 'LULLABY'] },
                    title: { type: 'STRING', description: 'Title or theme of the track' },
                  },
                  required: ['trackType', 'title'],
                },
              },
            ],
          },
        ],
      },
    };

    ws.send(JSON.stringify(setupFrame));
  }

  relayMicChunkToGemini(geminiWs: WebSocket, pcmChunk: Buffer) {
    if (geminiWs.readyState !== WebSocket.OPEN) return;

    const message = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: pcmChunk.toString('base64'),
          },
        ],
      },
    };

    geminiWs.send(JSON.stringify(message));
  }

  sendToolResponse(geminiWs: WebSocket, toolCallId: string, output: Record<string, any>) {
    if (geminiWs.readyState !== WebSocket.OPEN) return;

    const responsePayload = {
      toolResponse: {
        functionResponses: [
          {
            id: toolCallId,
            response: { output },
          },
        ],
      },
    };

    geminiWs.send(JSON.stringify(responsePayload));
  }
}
```

### Step 3: Smart Toy WebSocket Gateway (`src/gemini-live/smart-toy.gateway.ts`)
```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, WebSocket as ClientSocket } from 'ws';
import { Logger } from '@nestjs/common';
import { GeminiLiveRelayService } from './gemini-live-relay.service';

interface ActiveSession {
  toyWs: ClientSocket;
  geminiWs: ClientSocket;
}

@WebSocketGateway({ path: '/stream/toy' })
export class SmartToyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SmartToyGateway.name);
  private sessions = new Map<ClientSocket, ActiveSession>();

  constructor(private readonly geminiRelay: GeminiLiveRelayService) {}

  handleConnection(toyWs: ClientSocket) {
    this.logger.log('Smart Toy connected to gateway');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY is not defined in environment variables');
      toyWs.close(1008, 'API Key missing');
      return;
    }

    const geminiWs = this.geminiRelay.createGeminiLiveSession(apiKey);
    const session: ActiveSession = { toyWs, geminiWs };
    this.sessions.set(toyWs, session);

    geminiWs.on('message', (rawData: string) => {
      this.processGeminiDownstream(session, rawData);
    });

    geminiWs.on('error', (err) => {
      this.logger.error('Gemini WS Error:', err);
    });

    toyWs.on('message', (data: Buffer, isBinary: boolean) => {
      if (isBinary) {
        this.geminiRelay.relayMicChunkToGemini(geminiWs, data);
      } else {
        this.handleToySignal(session, data.toString());
      }
    });
  }

  handleDisconnect(toyWs: ClientSocket) {
    this.logger.log('Smart Toy disconnected');
    const session = this.sessions.get(toyWs);
    if (session?.geminiWs?.readyState === ClientSocket.OPEN) {
      session.geminiWs.close();
    }
    this.sessions.delete(toyWs);
  }

  private processGeminiDownstream(session: ActiveSession, rawData: string) {
    try {
      const response = JSON.parse(rawData);

      // 1. Audio stream chunks from model
      if (response.serverContent?.modelTurn?.parts) {
        for (const part of response.serverContent.modelTurn.parts) {
          if (part.inlineData && part.inlineData.mimeType.startsWith('audio/pcm')) {
            const rawPcm = Buffer.from(part.inlineData.data, 'base64');
            if (session.toyWs.readyState === ClientSocket.OPEN) {
              session.toyWs.send(rawPcm);
            }
          }
        }
      }

      // 2. Interruption signal (user began speaking)
      if (response.serverContent?.interrupted) {
        this.logger.log('Interruption detected: Sending FLUSH_SPEAKER');
        if (session.toyWs.readyState === ClientSocket.OPEN) {
          session.toyWs.send(JSON.stringify({ cmd: 'FLUSH_SPEAKER' }));
        }
      }

      // 3. Tool execution calls
      if (response.toolCall?.functionCalls) {
        for (const call of response.toolCall.functionCalls) {
          this.executeFunctionCall(session, call);
        }
      }
    } catch (err) {
      this.logger.error('Error parsing Gemini message:', err);
    }
  }

  private async executeFunctionCall(session: ActiveSession, call: any) {
    this.logger.log(`Executing tool: ${call.name}`);
    let result: Record<string, any> = { success: true };

    if (call.name === 'playStoryOrLullaby') {
      result = { status: 'playing', title: call.args.title };
    }

    this.geminiRelay.sendToolResponse(session.geminiWs, call.id, result);
  }

  private handleToySignal(session: ActiveSession, rawJson: string) {
    try {
      const msg = JSON.parse(rawJson);
      this.logger.log(`Received toy signal: ${msg.event || msg.cmd}`);
    } catch {
      // Ignore malformed text packets
    }
  }
}
```

---

## 4. Rollout Checklist

- [ ] Set `GEMINI_API_KEY` in environment variables.
- [ ] Configure `SmartToyGateway` and `GeminiLiveRelayService` in your NestJS module providers.
- [ ] Ensure ESP32 firmware streams 16kHz raw PCM binary chunks to `/stream/toy`.
- [ ] Handle `{ "cmd": "FLUSH_SPEAKER" }` on ESP32 to clear DMA buffer upon user speech interruption.
