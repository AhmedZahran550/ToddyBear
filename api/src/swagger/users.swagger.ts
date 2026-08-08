import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { CreateUserDto } from '../modules/users/dto/create-user.dto';
import { UpdateUserDto } from '../modules/users/dto/update-user.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

export function ApiUsersDocs() {
  return applyDecorators(ApiTags('Users'), ApiBearerAuth('bearer-auth'));
}

export function ApiCreateUserDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create User',
      description: 'Creates a new user record in the system (Admin / Support only).',
    }),
    ApiBody({ type: CreateUserDto }),
    ApiResponse({ status: 21, description: 'User created successfully.' }),
    ApiResponse({ status: 400, description: 'Validation error' }),
    ApiResponse({ status: 403, description: 'Forbidden (Requires Admin or Support role)' }),
  );
}

export function ApiFindAllUsersDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Find All Users',
      description: 'Retrieves a paginated list of all users.',
    }),
    ApiQuery({ type: PaginationQueryDto }),
    ApiResponse({
      status: 200,
      description: 'Paginated user list.',
      schema: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d' },
                mobileNumber: { type: 'string', example: '+201234567890' },
                name: { type: 'string', example: 'Ahmed Zahran' },
                isActive: { type: 'boolean', example: true },
                createdAt: { type: 'string', example: '2026-08-08T15:00:00.000Z' },
              },
            },
          },
          meta: {
            type: 'object',
            properties: {
              total: { type: 'number', example: 45 },
              page: { type: 'number', example: 1 },
              limit: { type: 'number', example: 10 },
              totalPages: { type: 'number', example: 5 },
            },
          },
        },
      },
    }),
  );
}

export function ApiFindOneUserDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Find User by ID',
      description: 'Retrieves details of a specific user by UUID.',
    }),
    ApiParam({ name: 'id', description: 'User UUID', example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d' }),
    ApiResponse({ status: 200, description: 'User details found.' }),
    ApiResponse({ status: 404, description: 'User not found.' }),
  );
}

export function ApiUpdateUserDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update User',
      description: 'Updates specific properties of an existing user by UUID.',
    }),
    ApiParam({ name: 'id', description: 'User UUID', example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d' }),
    ApiBody({ type: UpdateUserDto }),
    ApiResponse({ status: 200, description: 'User updated successfully.' }),
    ApiResponse({ status: 404, description: 'User not found.' }),
  );
}

export function ApiRemoveUserDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Delete User',
      description: 'Deletes a user record by UUID.',
    }),
    ApiParam({ name: 'id', description: 'User UUID', example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d' }),
    ApiResponse({ status: 200, description: 'User removed successfully.' }),
    ApiResponse({ status: 404, description: 'User not found.' }),
  );
}
