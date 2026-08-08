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
  return applyDecorators(ApiTags('Usage Analytics'), ApiBearerAuth('bearer-auth'));
}

export function ApiFindAllUsageDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Find All Usage Logs',
      description: 'Retrieves overall usage activity logs across all devices (Admin/Support only).',
    }),
    ApiQuery({ type: PaginationQueryDto }),
    ApiResponse({ status: 200, description: 'Paginated usage logs.' }),
    ApiResponse({ status: 403, description: 'Forbidden (Requires Admin or Support role)' }),
  );
}

export function ApiGetOverallStatsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get Overall Usage Statistics',
      description: 'Calculates aggregated usage statistics across the entire system.',
    }),
    ApiResponse({
      status: 200,
      description: 'Overall system usage statistics.',
    }),
    ApiResponse({ status: 403, description: 'Forbidden (Requires Admin or Support role)' }),
  );
}

export function ApiFindByDeviceUsageDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Find Usage Logs by Device',
      description: 'Retrieves usage logs for a specific device.',
    }),
    ApiParam({ name: 'deviceId', description: 'Device UUID', example: 'c56a4180-65aa-42ec-a945-5fd21dec0538' }),
    ApiQuery({ type: PaginationQueryDto }),
    ApiResponse({ status: 200, description: 'Device usage logs.' }),
  );
}

export function ApiGetDeviceStatsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get Device Usage Statistics',
      description: 'Calculates total interaction count, active duration, and session metrics for a device.',
    }),
    ApiParam({ name: 'deviceId', description: 'Device UUID', example: 'c56a4180-65aa-42ec-a945-5fd21dec0538' }),
    ApiResponse({ status: 200, description: 'Device usage statistics.' }),
  );
}
