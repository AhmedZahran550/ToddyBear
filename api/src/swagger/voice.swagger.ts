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

