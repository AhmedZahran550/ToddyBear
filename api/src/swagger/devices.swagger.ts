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
import { RegisterDeviceDto } from '../modules/devices/dto/register-device.dto';
import { UpdateDeviceDto } from '../modules/devices/dto/update-device.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

export function ApiDevicesDocs() {
  return applyDecorators(ApiTags('Devices'), ApiBearerAuth('bearer-auth'));
}

export function ApiRegisterDeviceDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Register Device',
      description: 'Registers a new ToddyBear device with MAC address to the authenticated user account.',
    }),
    ApiBody({ type: RegisterDeviceDto }),
    ApiResponse({ status: 201, description: 'Device registered successfully.' }),
    ApiResponse({ status: 400, description: 'Invalid MAC address format or validation failure' }),
    ApiResponse({ status: 409, description: 'Device MAC address already registered' }),
  );
}

export function ApiFindAllDevicesDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Find All Devices',
      description: 'Retrieves a list of devices. Users view their own devices; admins view all devices.',
    }),
    ApiQuery({ type: PaginationQueryDto }),
    ApiResponse({
      status: 200,
      description: 'Paginated device list.',
    }),
  );
}

export function ApiFindOneDeviceDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Find Device by ID',
      description: 'Retrieves device details by UUID.',
    }),
    ApiParam({ name: 'id', description: 'Device UUID', example: 'c56a4180-65aa-42ec-a945-5fd21dec0538' }),
    ApiResponse({ status: 200, description: 'Device details.' }),
    ApiResponse({ status: 404, description: 'Device not found.' }),
  );
}

export function ApiUpdateDeviceDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update Device',
      description: 'Updates device settings (name, WiFi credentials, child age/gender).',
    }),
    ApiParam({ name: 'id', description: 'Device UUID', example: 'c56a4180-65aa-42ec-a945-5fd21dec0538' }),
    ApiBody({ type: UpdateDeviceDto }),
    ApiResponse({ status: 200, description: 'Device updated successfully.' }),
    ApiResponse({ status: 404, description: 'Device not found.' }),
  );
}

export function ApiRemoveDeviceDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Delete Device',
      description: 'Unregisters and deletes a device by UUID.',
    }),
    ApiParam({ name: 'id', description: 'Device UUID', example: 'c56a4180-65aa-42ec-a945-5fd21dec0538' }),
    ApiResponse({ status: 200, description: 'Device removed successfully.' }),
    ApiResponse({ status: 404, description: 'Device not found.' }),
  );
}

export function ApiGetDeviceStatusDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get Device Online Status',
      description: 'Checks if the device is currently online based on lastSeenAt timestamp.',
    }),
    ApiParam({ name: 'id', description: 'Device UUID', example: 'c56a4180-65aa-42ec-a945-5fd21dec0538' }),
    ApiResponse({
      status: 200,
      description: 'Device online status state.',
      schema: {
        type: 'object',
        properties: {
          online: { type: 'boolean', example: true },
          lastSeen: { type: 'string', example: '2026-08-08T19:15:00.000Z' },
          macAddress: { type: 'string', example: 'AA:BB:CC:DD:EE:FF' },
        },
      },
    }),
    ApiResponse({ status: 404, description: 'Device not found.' }),
  );
}
