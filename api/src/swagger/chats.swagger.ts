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

export function ApiChatsDocs() {
  return applyDecorators(ApiTags('Chats'), ApiBearerAuth('bearer-auth'));
}

export function ApiFindByDeviceChatsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get Device Chat History',
      description: 'Retrieves conversation transcript history for a specific device.',
    }),
    ApiParam({ name: 'deviceId', description: 'Device UUID', example: 'c56a4180-65aa-42ec-a945-5fd21dec0538' }),
    ApiQuery({ type: PaginationQueryDto }),
    ApiResponse({
      status: 200,
      description: 'Paginated list of voice chat messages.',
    }),
  );
}

export function ApiClearByDeviceChatsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Clear Device Chat History',
      description: 'Deletes all recorded chat conversation messages for a specific device.',
    }),
    ApiParam({ name: 'deviceId', description: 'Device UUID', example: 'c56a4180-65aa-42ec-a945-5fd21dec0538' }),
    ApiResponse({ status: 200, description: 'Device chat history cleared successfully.' }),
  );
}
