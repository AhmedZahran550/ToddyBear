import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';

export function ApiGeminiLiveDocs() {
  return ApiTags('Gemini Live Streaming');
}

export function ApiGeminiLiveInfoDocs() {
  return applyDecorators(
    ApiBearerAuth('bearer-auth'),
    ApiOperation({
      summary: 'Gemini Live Streaming WebSocket Protocol & Overview',
      description: `
## Real-Time Bi-Directional Multimodal Streaming
The voice pipeline is powered by the **Gemini Multimodal Live API** over a persistent WebSocket connection.

### Connection Endpoint
\`\`\`
ws://<server-host>:<port>/stream/toy?token=<DEVICE_JWT_TOKEN>
\`\`\`

### Authentication
Pass the authenticated device JWT access token (obtained via \`POST /api/auth/device/login\`) as the \`token\` query parameter in the WebSocket connection URL.

---

### Protocol Specifications

#### 1. Toy ➔ Backend (Microphone Stream & Upstream Signals)
- **Binary Frames**: Raw Linear PCM audio chunk (\`16-bit LE, 16,000 Hz, Mono\`, recommended size 512–1024 bytes / 32–64ms).
- **Text Frames**: JSON control payloads:
  - \`{"event": "user_text", "text": "Hello Toddy"}\` (Optional text injection or transcription)

#### 2. Backend ➔ Toy (Speaker Audio Stream & Downstream Commands)
- **Binary Frames**: Raw Linear PCM audio response stream directly from Gemini (\`16-bit LE, 24,000 Hz, Mono\`).
- **Text Frames**: JSON command signals:
  - \`{"cmd": "SESSION_READY", "sessionId": "..."}\` — Live session initialized and ready for streaming.
  - \`{"cmd": "FLUSH_SPEAKER"}\` — Interruption event (child started talking while audio was playing; firmware must immediately flush DMA speaker audio buffer).
  - \`{"cmd": "SESSION_ERROR", "message": "..."}\` — An error occurred on the upstream AI connection.
  - \`{"cmd": "SESSION_TIMEOUT", "message": "..."}\` — Session automatically closed due to inactivity.

---

### Native Function Calling Tools
The Gemini Live model automatically triggers server-side tools during real-time speech:
1. **\`setAlarm(time: string, label?: string)\`**: Sets a new alarm at HH:MM 24-hour time.
2. **\`disableAlarm(time: string)\`**: Turns off or cancels an existing alarm at HH:MM.
3. **\`clearAllAlarms()\`**: Clears and deletes all alarms for the child.
4. **\`sendMessage(recipient: string, content: string)\`**: Dispatches a message to family members (dad, mom, etc.).
      `,
    }),
    ApiResponse({
      status: 200,
      description: 'Overview and WebSocket connection configuration parameters.',
      schema: {
        type: 'object',
        properties: {
          websocketUrl: { type: 'string', example: '/stream/toy' },
          authMethod: { type: 'string', example: 'query_param_token' },
          audioInput: {
            type: 'object',
            properties: {
              format: { type: 'string', example: 'pcm_s16le' },
              sampleRate: { type: 'number', example: 16000 },
              channels: { type: 'number', example: 1 },
              frameSize: { type: 'string', example: '512-1024 bytes' },
            },
          },
          audioOutput: {
            type: 'object',
            properties: {
              format: { type: 'string', example: 'pcm_s16le' },
              sampleRate: { type: 'number', example: 24000 },
              channels: { type: 'number', example: 1 },
            },
          },
          supportedFunctions: {
            type: 'array',
            items: { type: 'string' },
            example: [
              'setAlarm',
              'disableAlarm',
              'clearAllAlarms',
              'sendMessage',
            ],
          },
          model: {
            type: 'string',
            example: 'gemini-2.5-flash-preview-native-audio-dialog',
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized / Missing device authentication token',
    }),
  );
}
