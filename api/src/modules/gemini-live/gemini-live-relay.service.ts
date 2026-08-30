import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';

@Injectable()
export class GeminiLiveRelayService {
  private readonly logger = new Logger(GeminiLiveRelayService.name);
  private readonly HOST = 'generativelanguage.googleapis.com';
  private readonly PATH =
    '/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

  constructor(private readonly configService: ConfigService) {}

  createGeminiLiveSession(apiKey: string, systemPrompt: string): WebSocket {
    const wsUrl = `wss://${this.HOST}${this.PATH}?key=${apiKey}`;
    this.logger.log(`🔗 Connecting to Gemini Live API: wss://${this.HOST}${this.PATH}?key=***`);
    const geminiWs = new WebSocket(wsUrl);

    geminiWs.on('open', () => {
      this.logger.log('🟢 Connected to Gemini Multimodal Live API');
      this.sendHandshakeSetup(geminiWs, systemPrompt);
    });

    geminiWs.on('error', (err) => {
      this.logger.error(`❌ Gemini WS connection error: ${err.message}`);
    });

    (geminiWs as any).on('unexpected-response', (_req: any, res: any) => {
      let body = '';
      res.on('data', (chunk: Buffer) => {
        body += chunk.toString();
      });
      res.on('end', () => {
        this.logger.error(
          `❌ Gemini WS unexpected HTTP response: status=${res.statusCode}, body=${body}`,
        );
      });
    });

    return geminiWs;
  }

  private sendHandshakeSetup(ws: WebSocket, systemPrompt: string) {
    let modelName = this.configService.get<string>(
      'GEMINI_LIVE_MODEL',
      'gemini-3.1-flash-live-preview',
    );
    if (!modelName.startsWith('models/')) {
      modelName = `models/${modelName}`;
    }

    const voiceName = this.configService.get<string>(
      'GEMINI_LIVE_VOICE',
      'Puck',
    );

    const setupFrame = {
      setup: {
        model: modelName,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
        },
        systemInstruction: {
          parts: [
            {
              text: systemPrompt,
            },
          ],
        },
        tools: [
          {
            functionDeclarations: [
              {
                name: 'setAlarm',
                description:
                  'Sets a new alarm for the child at a specific time in 24-hour HH:MM format.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    time: {
                      type: 'STRING',
                      description:
                        'Alarm time in HH:MM 24-hour format (e.g. 07:30 or 20:00).',
                    },
                    label: {
                      type: 'STRING',
                      description:
                        'Optional short label describing the alarm.',
                    },
                  },
                  required: ['time'],
                },
              },
              {
                name: 'disableAlarm',
                description:
                  'Disables or turns off an existing alarm at a specific time in 24-hour format.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    time: {
                      type: 'STRING',
                      description:
                        'Alarm time in HH:MM 24-hour format to turn off.',
                    },
                  },
                  required: ['time'],
                },
              },
              {
                name: 'clearAllAlarms',
                description: 'Clears and deletes all alarms for the child.',
                parameters: {
                  type: 'OBJECT',
                  properties: {},
                },
              },
              {
                name: 'sendMessage',
                description:
                  'Sends a text message to a family member (e.g. dad, mom) on behalf of the child.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    recipient: {
                      type: 'STRING',
                      description:
                        'Recipient name (e.g. dad, mom, father, mother).',
                    },
                    content: {
                      type: 'STRING',
                      description: 'The text message content to send.',
                    },
                  },
                  required: ['recipient', 'content'],
                },
              },
            ],
          },
        ],
      },
    };

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(setupFrame));
      this.logger.log(`📤 Gemini Live setup frame sent with model: ${modelName}, voice: ${voiceName}`);
    }
  }

  relayMicChunkToGemini(geminiWs: WebSocket, pcmChunk: Buffer) {
    if (geminiWs.readyState !== WebSocket.OPEN) return;

    const message = {
      realtimeInput: {
        audio: {
          mimeType: 'audio/pcm;rate=16000',
          data: pcmChunk.toString('base64'),
        },
      },
    };

    geminiWs.send(JSON.stringify(message));
  }

  sendToolResponse(
    geminiWs: WebSocket,
    toolCallId: string,
    toolName: string,
    output: Record<string, any>,
  ) {
    if (geminiWs.readyState !== WebSocket.OPEN) return;

    const responsePayload = {
      toolResponse: {
        functionResponses: [
          {
            id: toolCallId,
            name: toolName,
            response: { output },
          },
        ],
      },
    };

    geminiWs.send(JSON.stringify(responsePayload));
    this.logger.log(
      `📤 Tool response sent to Gemini (id: ${toolCallId}, name: ${toolName})`,
    );
  }
}
