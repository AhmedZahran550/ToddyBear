import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiHeader,
  ApiBody,
  ApiConsumes,
  ApiProduces,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PushMessageDto } from '../modules/voice/dto/push-message.dto';

export function ApiVoiceDocs() {
  return ApiTags('Voice & AI Assistant');
}

export function ApiVoiceAssistantDocs() {
  return applyDecorators(
    ApiBearerAuth('bearer-auth'),
    ApiOperation({
      summary: 'Voice Assistant Audio Pipeline (Device Auth Required)',
      description:
        'Receives raw audio stream (WAV/PCM) from an authenticated hardware device. Requires Authorization Bearer token obtained from POST /api/auth/device/login. Performs Speech-to-Text (STT via Groq Whisper), processes intent / Groq LLaMA AI response with child-friendly prompt and chat history, and returns Text-to-Speech (TTS via Cartesia PCM 16kHz) audio stream.',
    }),
    ApiConsumes('application/octet-stream'),
    ApiProduces('application/octet-stream'),
    ApiResponse({
      status: 200,
      description:
        'Audio response generated successfully. Returns raw PCM 16kHz audio stream with headers X-Audio-Format: pcm_s16le and X-Sample-Rate: 16000.',
    }),
    ApiResponse({ status: 204, description: 'No Speech Detected / Silence' }),
    ApiResponse({ status: 400, description: 'Audio payload too short or missing' }),
    ApiResponse({ status: 401, description: 'Unauthorized / Missing or invalid device JWT token' }),
    ApiResponse({ status: 500, description: 'STT, AI, or TTS provider processing failure' }),
  );
}

export function ApiVoicePushDocs() {
  return applyDecorators(
    ApiBearerAuth('bearer-auth'),
    ApiOperation({
      summary: 'Push Text-to-Speech Message to Device',
      description: 'Converts a text string to audio and queues it to be fetched by the device. Notifies device via SSE.',
    }),
    ApiHeader({
      name: 'x-device-mac',
      description: 'Target Device MAC Address',
      required: true,
      example: 'AA:BB:CC:DD:EE:FF',
    }),
    ApiBody({ type: PushMessageDto }),
    ApiResponse({
      status: 200,
      description: 'Message converted to TTS audio and queued.',
      schema: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Audio push queued and SSE notified' },
        },
      },
    }),
    ApiResponse({ status: 403, description: 'Forbidden / Unregistered MAC' }),
  );
}

export function ApiVoicePushPendingDocs() {
  return applyDecorators(
    ApiBearerAuth('bearer-auth'),
    ApiOperation({
      summary: 'Fetch Pending Push Audio (Device Auth Required)',
      description:
        'Called by an authenticated device (via Authorization Bearer token) when notified via SSE to retrieve queued push audio stream.',
    }),
    ApiProduces('application/octet-stream'),
    ApiResponse({
      status: 200,
      description: 'Queued audio stream returned.',
    }),
    ApiResponse({ status: 204, description: 'No pending push audio' }),
    ApiResponse({ status: 401, description: 'Unauthorized / Missing or invalid device JWT token' }),
  );
}

export function ApiGetSttProviderDocs() {
  return applyDecorators(
    ApiBearerAuth('bearer-auth'),
    ApiOperation({
      summary: 'Get Current STT Provider',
      description: 'Returns the currently active Speech-to-Text provider (groq or google).',
    }),
    ApiResponse({
      status: 200,
      schema: {
        type: 'object',
        properties: {
          provider: { type: 'string', example: 'groq' },
        },
      },
    }),
  );
}

export function ApiSetSttProviderDocs() {
  return applyDecorators(
    ApiBearerAuth('bearer-auth'),
    ApiOperation({
      summary: 'Set Active STT Provider',
      description: 'Switches the active STT provider between "groq" and "google".',
    }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          provider: { type: 'string', enum: ['groq', 'google'], example: 'google' },
        },
        required: ['provider'],
      },
    }),
    ApiResponse({
      status: 200,
      schema: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', example: true },
          provider: { type: 'string', example: 'google' },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Provider must be "groq" or "google"' }),
  );
}

export function ApiGetAiProviderDocs() {
  return applyDecorators(
    ApiBearerAuth('bearer-auth'),
    ApiOperation({
      summary: 'Get Current AI Provider Info',
      description:
        'Returns the currently active AI provider, active model, and configured provider options.',
    }),
    ApiResponse({
      status: 200,
      schema: {
        type: 'object',
        properties: {
          activeProvider: { type: 'string', example: 'gemini' },
          activeModel: { type: 'string', example: 'gemini-3.6-flash' },
          geminiModel: { type: 'string', example: 'gemini-3.6-flash' },
          groqModel: { type: 'string', example: 'openai/gpt-oss-20b' },
          availableProviders: {
            type: 'array',
            items: { type: 'string' },
            example: ['gemini', 'groq'],
          },
        },
      },
    }),
  );
}

export function ApiSetAiProviderDocs() {
  return applyDecorators(
    ApiBearerAuth('bearer-auth'),
    ApiOperation({
      summary: 'Set Active AI Provider and Model',
      description:
        'Switches the active AI provider (gemini / groq) and optionally sets custom model name.',
    }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          provider: {
            type: 'string',
            enum: ['gemini', 'groq'],
            example: 'gemini',
          },
          model: {
            type: 'string',
            example: 'gemini-2.5-flash',
            description: 'Optional model override for the selected provider',
          },
        },
        required: ['provider'],
      },
    }),
    ApiResponse({
      status: 200,
      schema: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', example: true },
          providerInfo: {
            type: 'object',
            properties: {
              activeProvider: { type: 'string', example: 'gemini' },
              activeModel: { type: 'string', example: 'gemini-2.5-flash' },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Provider must be "gemini" or "groq"',
    }),
  );
}

export function ApiVoiceStreamDocs() {
  return applyDecorators(
    ApiBearerAuth('bearer-auth'),
    ApiOperation({
      summary: 'WebSocket Voice Streaming Protocol & Specification',
      description: `
### Real-Time Overlapped Voice Streaming Architecture (\`ws://host:port/voice-stream\`)

This endpoint documents the high-performance WebSocket streaming pipeline designed for embedded hardware devices (e.g., ToddyBear smart assistant).

#### 1. Connection & Authentication
- **Transport**: Standard WebSocket (\`ws://\` or \`wss://\`) on path \`/voice-stream\`
- **Auth Query Param**: \`ws://host:port/voice-stream?token=<DEVICE_JWT_TOKEN>\`
- **Auth Header Alternative**: \`Authorization: Bearer <DEVICE_JWT_TOKEN>\`

---

#### 2. Audio Format Specification
- **Audio Encoding**: \`pcm_s16le\` (Raw 16-bit signed integer, Little-Endian)
- **Sample Rate**: \`16000\` Hz (16 kHz)
- **Channels**: \`1\` (Mono)
- **Framing**: Raw PCM audio bytes without per-chunk WAV headers. For streaming playback, the device hardware directly streams incoming binary chunks into the I2S/DAC audio ring buffer.

---

#### 3. Client \u2192 Server Messages

| Event / Payload | Type | Description |
|---|---|---|
| \`{ "event": "audio_start", "language": "ar", "sampleRate": 16000 }\` | JSON | Initiates a new user utterance session. Prepares streaming STT (Deepgram). |
| Binary Buffer (\`Buffer\`) | Binary | Raw microphone PCM audio chunks (send ~100-200ms of audio per binary frame). |
| \`{ "event": "audio_stop" }\` | JSON | Signals that user finished speaking (or microphone button released). |
| \`{ "event": "ping" }\` | JSON | Heartbeat ping. Server responds with \`{ "event": "pong" }\`. |

---

#### 4. Server → Client Messages

| Event / Payload | Type | Description |
|---|---|---|
| \`{ "event": "connection_ready", "device": {...} }\` | JSON | Sent upon successful JWT handshake. |
| \`{ "event": "audio_started", "sessionId": "...", "sampleRate": 16000 }\` | JSON | Confirms STT session is initialized and ready for binary PCM audio. |
| \`{ "event": "transcript", "text": "...", "isFinal": boolean }\` | JSON | Real-time partial and final transcripts from streaming STT. |
| \`{ "event": "ai_thinking", "transcript": "..." }\` | JSON | Sent the moment speech ends and LLM generation begins. |
| \`{ "event": "audio_response_start", "sampleRate": 16000, "encoding": "pcm_s16le", "format": "raw_pcm" }\` | JSON | Signals that TTS audio chunks are about to be streamed. |
| Binary Buffer (\`Buffer\`) | Binary | Raw PCM audio stream chunks from Cartesia streaming TTS. Sent in real-time as sentences generate. |
| \`{ "event": "audio_response_end" }\` | JSON | Signals audio generation and playback stream is complete. |
| \`{ "event": "silence_detected" }\` | JSON | Sent when \`audio_stop\` completes but no speech was transcribed. |
| \`{ "event": "busy", "message": "..." }\` | JSON | Sent if an \`audio_start\` is received while a previous AI response is still generating. |
| \`{ "event": "error", "stage": "stt|llm|tts|auth|pipeline", "message": "..." }\` | JSON | Error notifications with stage attribution. |

---

#### 5. Three-Stage Overlapped Latency Pipeline
1. **Streaming STT**: Deepgram ASR returns partial transcripts and fires end-of-utterance immediately on pause.
2. **Streaming LLM**: Groq / Gemini SSE completion buffers tokens into sentence units.
3. **Streaming TTS**: Cartesia WebSocket synthesizes audio sentence-by-sentence and streams PCM back to the device.

---

#### 6. Server Memory Optimization & Safety Safeguards
- **TTL Telemetry Reaper**: Automatic 60s reaper evicts orphaned/stale telemetry sessions (>120s) to prevent memory leaks from dropped connections.
- **Context Safety Timeouts**: Cartesia TTS contexts auto-expire after 30s to prevent hanging emitters if upstream connections drop.
- **Byte-Budget Cache**: In-memory TTS phrase cache is strictly capped at 10 MB with byte-aware LRU eviction.
- **AbortController Teardown**: Client disconnects immediately trigger abort signals that terminate upstream AI/TTS streams and free Node.js buffer allocations.
- **Concurrency Rejection**: Active AI generation locks prevent duplicate or overlapping processing pipelines on the same socket.
      `,
    }),
    ApiResponse({
      status: 200,
      description: 'WebSocket protocol specification returned as JSON metadata.',
    }),
  );
}

