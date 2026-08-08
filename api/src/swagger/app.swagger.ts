import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

export function ApiAppDocs() {
  return ApiTags('App');
}

export function ApiGetHelloDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get Hello World',
      description: 'Returns a greeting string to test basic server connectivity.',
    }),
    ApiResponse({
      status: 200,
      description: 'Server is reachable.',
      schema: {
        type: 'string',
        example: 'Hello World!',
      },
    }),
  );
}

export function ApiHealthCheckDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Health Check',
      description: 'Returns backend application status, server uptime, and memory statistics.',
    }),
    ApiResponse({
      status: 200,
      description: 'System health metrics.',
      schema: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          timestamp: { type: 'string', example: '2026-08-08T19:00:00.000Z' },
          uptime: { type: 'number', example: 120.45 },
          memory: {
            type: 'object',
            properties: {
              rss: { type: 'number', example: 85400000 },
              heapTotal: { type: 'number', example: 45000000 },
              heapUsed: { type: 'number', example: 32000000 },
              external: { type: 'number', example: 2500000 },
            },
          },
        },
      },
    }),
  );
}
