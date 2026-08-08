import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';

export function ApiSseDocs() {
  return ApiTags('SSE (Server-Sent Events)');
}

export function ApiDeviceEventsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Device Real-time Event Stream',
      description: 'Establishes a Server-Sent Events (SSE) connection stream for real-time notification triggers to the target hardware device.',
    }),
    ApiParam({
      name: 'macAddress',
      description: 'Device hardware MAC address',
      example: 'AA:BB:CC:DD:EE:FF',
    }),
    ApiResponse({
      status: 200,
      description: 'SSE event stream connection established (text/event-stream).',
      schema: {
        type: 'object',
        properties: {
          data: { type: 'object', example: { type: 'PENDING_AUDIO' } },
        },
      },
    }),
  );
}
