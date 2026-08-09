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
import { CreateAlarmDto } from '../modules/alarms/dto/create-alarm.dto';
import { UpdateAlarmDto } from '../modules/alarms/dto/update-alarm.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

export function ApiAlarmsDocs() {
  return applyDecorators(ApiTags('Alarms'), ApiBearerAuth('bearer-auth'));
}

export function ApiCreateAlarmDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create Alarm for User',
      description: 'Creates a scheduled alarm for a specific user by userId.',
    }),
    ApiParam({
      name: 'userId',
      description: 'User UUID',
      example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    }),
    ApiBody({ type: CreateAlarmDto }),
    ApiResponse({ status: 201, description: 'Alarm created successfully.' }),
    ApiResponse({
      status: 400,
      description: 'Invalid time format (must be HH:mm)',
    }),
  );
}

export function ApiFindByUserAlarmsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List Alarms for User',
      description: 'Retrieves all alarms scheduled for a specific user.',
    }),
    ApiParam({
      name: 'userId',
      description: 'User UUID',
      example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    }),
    ApiQuery({ type: PaginationQueryDto }),
    ApiResponse({ status: 200, description: 'List of user alarms.' }),
  );
}

export function ApiFindOneAlarmDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Find Alarm by ID',
      description: 'Retrieves alarm details by alarm UUID.',
    }),
    ApiParam({
      name: 'id',
      description: 'Alarm UUID',
      example: '3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d',
    }),
    ApiResponse({ status: 200, description: 'Alarm details found.' }),
    ApiResponse({ status: 404, description: 'Alarm not found.' }),
  );
}

export function ApiUpdateAlarmDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update Alarm',
      description: 'Updates alarm properties (time, label, enabled status).',
    }),
    ApiParam({
      name: 'id',
      description: 'Alarm UUID',
      example: '3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d',
    }),
    ApiBody({ type: UpdateAlarmDto }),
    ApiResponse({ status: 200, description: 'Alarm updated successfully.' }),
    ApiResponse({ status: 404, description: 'Alarm not found.' }),
  );
}

export function ApiRemoveAlarmDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Delete Alarm',
      description: 'Deletes an alarm by UUID.',
    }),
    ApiParam({
      name: 'id',
      description: 'Alarm UUID',
      example: '3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d',
    }),
    ApiResponse({ status: 200, description: 'Alarm deleted successfully.' }),
    ApiResponse({ status: 404, description: 'Alarm not found.' }),
  );
}
