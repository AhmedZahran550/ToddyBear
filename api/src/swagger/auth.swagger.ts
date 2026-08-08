import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { UserLoginDto } from '../modules/auth/dto/user-login.dto';
import { VerifyOtpDto } from '../modules/auth/dto/verify-otp.dto';
import { EmployeeLoginDto } from '../modules/auth/dto/employee-login.dto';

export function ApiAuthDocs() {
  return ApiTags('Authentication');
}

export function ApiSendUserOtpDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Send Mobile OTP',
      description: 'Generates and sends a 6-digit OTP code to the specified user mobile number.',
    }),
    ApiBody({ type: UserLoginDto }),
    ApiResponse({
      status: 200,
      description: 'OTP sent successfully.',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'OTP sent successfully' },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Invalid mobile number format' }),
  );
}

export function ApiVerifyUserOtpDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Verify Mobile OTP',
      description: 'Verifies the OTP code and returns access/refresh JWT tokens.',
    }),
    ApiBody({ type: VerifyOtpDto }),
    ApiResponse({
      status: 200,
      description: 'OTP verified successfully.',
      schema: {
        type: 'object',
        properties: {
          accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d' },
              mobileNumber: { type: 'string', example: '+201234567890' },
              isActive: { type: 'boolean', example: true },
            },
          },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Invalid or expired OTP code' }),
  );
}

export function ApiEmployeeLoginDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Employee Login',
      description: 'Authenticates an employee (Admin/Support) using email and password.',
    }),
    ApiBody({ type: EmployeeLoginDto }),
    ApiResponse({
      status: 200,
      description: 'Employee logged in successfully.',
      schema: {
        type: 'object',
        properties: {
          accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          employee: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '18fbd92e-e5e9-4e3e-a9a3-b98f2512b2a4' },
              email: { type: 'string', example: 'admin@toddybear.com' },
              name: { type: 'string', example: 'John Admin' },
              role: { type: 'string', example: 'admin' },
            },
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Invalid credentials' }),
  );
}
