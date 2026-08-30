import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiHeader,
  ApiBody,
  ApiProduces,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PushMessageDto } from '../modules/voice/dto/push-message.dto';

export function ApiVoiceDocs() {
  return ApiTags('Voice & Push Audio');
}

export function ApiVoicePushDocs() {
  return applyDecorators(
    ApiBearerAuth('bearer-auth'),
    ApiOperation({
      summary: 'Push Text-to-Speech Message to Device',
      description:
        'Converts a text string to audio via Cartesia TTS and queues it to be fetched by the device. Notifies device via SSE.',
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
          message: {
            type: 'string',
            example: 'Audio push queued and SSE notified',
          },
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
    ApiResponse({
      status: 401,
      description: 'Unauthorized / Missing or invalid device JWT token',
    }),
  );
}
