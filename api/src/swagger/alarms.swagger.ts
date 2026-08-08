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
      summary: 'Create Alarm for Device',
      description: 'Creates a scheduled alarm for a specific device by deviceId.',
    }),
    ApiParam({ name: 'deviceId', description: 'Device UUID', example: 'c56a4180-65aa-42ec-a945-5fd21dec0538' }),
    ApiBody({ type: CreateAlarmDto }),
    ApiResponse({ status: 201, description: 'Alarm created successfully.' }),
    ApiResponse({ status: 400, description: 'Invalid time format (must be HH:mm)' }),
  );
}

export function ApiFindByDeviceAlarmsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List Alarms for Device',
      description: 'Retrieves all alarms scheduled for a specific device.',
    }),
    ApiParam({ name: 'deviceId', description: 'Device UUID', example: 'c56a4180-65aa-42ec-a945-5fd21dec0538' }),
    ApiQuery({ type: PaginationQueryDto }),
    ApiResponse({ status: 200, description: 'List of device alarms.' }),
  );
}

export function ApiFindOneAlarmDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Find Alarm by ID',
      description: 'Retrieves alarm details by alarm UUID.',
    }),
    ApiParam({ name: 'id', description: 'Alarm UUID', example: '3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d' }),
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
    ApiParam({ name: 'id', description: 'Alarm UUID', example: '3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d' }),
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
    ApiParam({ name: 'id', description: 'Alarm UUID', example: '3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d' }),
    ApiResponse({ status: 200, description: 'Alarm deleted successfully.' }),
    ApiResponse({ status: 404, description: 'Alarm not found.' }),
  );
}
