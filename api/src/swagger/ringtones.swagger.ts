import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

export function ApiRingtonesDocs() {
  return applyDecorators(ApiTags('Ringtones'), ApiBearerAuth('bearer-auth'));
}

export function ApiUploadRingtoneDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Upload User Ringtone',
      description:
        'Uploads an audio ringtone file (MP3, WAV, OGG) for a user to Cloudinary. Max 5 ringtones per user, max 5MB per file.',
    }),
    ApiParam({
      name: 'userId',
      description: 'User UUID',
      example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['file', 'name'],
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: 'Audio file (mp3, wav, ogg)',
          },
          name: {
            type: 'string',
            description: 'Display name for the ringtone',
            example: 'Rooster Wakeup',
          },
        },
      },
    }),
    ApiResponse({ status: 201, description: 'Ringtone uploaded successfully.' }),
    ApiResponse({
      status: 400,
      description: 'Invalid file format, size exceeds 5MB, or user reached 5-ringtone cap.',
    }),
  );
}

export function ApiFindByUserRingtonesDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List User Ringtones (Custom + Default)',
      description: 'Retrieves all ringtones available to a user (system defaults + custom uploaded).',
    }),
    ApiParam({
      name: 'userId',
      description: 'User UUID',
      example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    }),
    ApiQuery({ type: PaginationQueryDto }),
    ApiResponse({ status: 200, description: 'List of available ringtones.' }),
  );
}

export function ApiFindDefaultRingtonesDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List Default System Ringtones',
      description: 'Retrieves all system built-in default ringtones.',
    }),
    ApiQuery({ type: PaginationQueryDto }),
    ApiResponse({ status: 200, description: 'List of default ringtones.' }),
  );
}

export function ApiFindOneRingtoneDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get Ringtone Details',
      description: 'Retrieves details of a specific ringtone by its ID.',
    }),
    ApiParam({
      name: 'id',
      description: 'Ringtone UUID',
      example: '3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d',
    }),
    ApiResponse({ status: 200, description: 'Ringtone details.' }),
    ApiResponse({ status: 404, description: 'Ringtone not found.' }),
  );
}

export function ApiDownloadRingtoneDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Proxy Download Ringtone Audio',
      description:
        'Streams the audio binary from Cloud Storage to the caller/Toddy Bear device directly.',
    }),
    ApiParam({
      name: 'id',
      description: 'Ringtone UUID',
      example: '3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d',
    }),
    ApiResponse({
      status: 200,
      description: 'Audio binary stream.',
      content: {
        'audio/mpeg': { schema: { type: 'string', format: 'binary' } },
      },
    }),
    ApiResponse({ status: 404, description: 'Ringtone not found.' }),
  );
}

export function ApiRemoveRingtoneDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Delete User Ringtone',
      description: 'Deletes a custom ringtone from Cloudinary and database by ringtone UUID and userId.',
    }),
    ApiParam({
      name: 'id',
      description: 'Ringtone UUID',
      example: '3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d',
    }),
    ApiQuery({
      name: 'userId',
      description: 'User UUID owning the ringtone',
      example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    }),
    ApiResponse({ status: 200, description: 'Ringtone deleted successfully.' }),
    ApiResponse({ status: 403, description: 'Cannot delete default ringtones or ringtones not owned by user.' }),
    ApiResponse({ status: 404, description: 'Ringtone not found.' }),
  );
}
