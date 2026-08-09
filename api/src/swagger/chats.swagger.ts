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

export function ApiFindByUserChatsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get User Chat History',
      description:
        'Retrieves conversation transcript history for a specific user.',
    }),
    ApiParam({
      name: 'userId',
      description: 'User UUID',
      example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    }),
    ApiQuery({ type: PaginationQueryDto }),
    ApiResponse({
      status: 200,
      description: 'Paginated list of voice chat messages.',
    }),
  );
}

export function ApiClearByUserChatsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Clear User Chat History',
      description:
        'Deletes all recorded chat conversation messages for a specific user.',
    }),
    ApiParam({
      name: 'userId',
      description: 'User UUID',
      example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    }),
    ApiResponse({
      status: 200,
      description: 'User chat history cleared successfully.',
    }),
  );
}
