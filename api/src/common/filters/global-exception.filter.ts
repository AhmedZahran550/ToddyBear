import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

const STATUS_TO_ERROR_CODE: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'RESOURCE_NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'INVALID_FORMAT',
  [HttpStatus.TOO_MANY_REQUESTS]: 'BAD_REQUEST',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
};

const MESSAGE_TO_ERROR_CODE: Record<string, string> = {
  'Invalid credentials': 'INVALID_CREDENTIALS',
  Unauthorized: 'UNAUTHORIZED',
  'Email already exists': 'EMAIL_EXISTS',
  'Please verify your email before logging in': 'VERIFY_EMAIL',
  'Account is inactive': 'ACCOUNT_INACTIVE',
  'Refresh token is missing': 'REFRESH_TOKEN_MISSING',
  'Invalid refresh token': 'INVALID_CREDENTIALS',
  'Invalid or expired refresh token': 'INVALID_CREDENTIALS',
  'Invalid or expired verification token': 'BAD_REQUEST',
  'User with this email does not exist': 'NOT_FOUND',
  'Email is already verified': 'CONFLICT',
  'Invalid or expired password reset token': 'INVALID_RESET_TOKEN',
  'Resource not found.': 'RESOURCE_NOT_FOUND',
  'Your session has expired. Please log in again.': 'TOKEN_EXPIRED',
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    // console.log(exception);

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    (request as any).error = exception;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exResponse = exception.getResponse();

      let rawMessage: any = 'Unknown error';
      let errorCode: string;
      let errors: any[] | undefined;

      if (typeof exResponse === 'string') {
        rawMessage = exResponse;
        errorCode =
          MESSAGE_TO_ERROR_CODE[rawMessage] ||
          STATUS_TO_ERROR_CODE[status] ||
          'INTERNAL_ERROR';
      } else if (typeof exResponse === 'object' && exResponse !== null) {
        const obj = exResponse as Record<string, any>;
        errors = obj.errors;
        rawMessage = obj.message || obj.error || 'Unknown error';
        if (Array.isArray(rawMessage)) {
          errors = rawMessage;
          rawMessage = 'Validation failed';
        }
        errorCode =
          obj.errorCode ||
          obj.code ||
          (typeof rawMessage === 'string'
            ? MESSAGE_TO_ERROR_CODE[rawMessage]
            : undefined) ||
          STATUS_TO_ERROR_CODE[status] ||
          'INTERNAL_ERROR';
      } else {
        errorCode = STATUS_TO_ERROR_CODE[status] || 'INTERNAL_ERROR';
      }

      if (errors && Array.isArray(errors)) {
        errors = errors.map((err: any) => {
          if (typeof err === 'string') {
            return { message: err };
          }
          if (err.message) {
            return err;
          }
          const constraintsEntries = err.constraints
            ? Object.entries(err.constraints)
            : [];
          const firstEntry = constraintsEntries[0];
          const firstConstraint = firstEntry
            ? String(firstEntry[1])
            : undefined;
          return {
            ...err,
            message: firstConstraint ?? '',
          };
        });
      }

      return response.status(status).json({
        statusCode: status,
        errorCode,
        message: rawMessage,
        ...(errors && errors.length > 0 ? { errors } : {}),
        path: request.originalUrl,
        timestamp: new Date().toISOString(),
        requestId: (request as any).requestId ?? undefined,
      });
    }

    this.logger.error(
      'Unhandled exception',
      exception instanceof Error ? exception.stack : exception,
    );

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: 'INTERNAL_ERROR',
      message: 'Internal server error',
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
      requestId: (request as any).requestId ?? undefined,
    });
  }
}
