import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

export function ApiUsageDocs() {
  return applyDecorators(
    ApiTags('Usage Analytics'),
    ApiBearerAuth('bearer-auth'),
  );
}

export function ApiFindAllUsageDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Find All Usage Logs',
      description:
        'Retrieves overall usage activity logs across all users (Admin/Support only).',
    }),
    ApiQuery({ type: PaginationQueryDto }),
    ApiResponse({ status: 200, description: 'Paginated usage logs.' }),
    ApiResponse({
      status: 403,
      description: 'Forbidden (Requires Admin or Support role)',
    }),
  );
}

export function ApiGetOverallStatsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get Overall Usage Statistics',
      description:
        'Calculates aggregated usage statistics across the entire system.',
    }),
    ApiResponse({
      status: 200,
      description: 'Overall system usage statistics.',
    }),
    ApiResponse({
      status: 403,
      description: 'Forbidden (Requires Admin or Support role)',
    }),
  );
}

export function ApiFindByUserUsageDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Find Usage Logs by User',
      description: 'Retrieves usage logs for a specific user.',
    }),
    ApiParam({
      name: 'userId',
      description: 'User UUID',
      example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    }),
    ApiQuery({ type: PaginationQueryDto }),
    ApiResponse({ status: 200, description: 'User usage logs.' }),
  );
}

export function ApiGetUserStatsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get User Usage Statistics',
      description:
        'Calculates total interaction count, active duration, and session metrics for a user.',
    }),
    ApiParam({
      name: 'userId',
      description: 'User UUID',
      example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    }),
    ApiResponse({ status: 200, description: 'User usage statistics.' }),
  );
}
