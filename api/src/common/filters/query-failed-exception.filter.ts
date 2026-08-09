import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';
import { DBErrorCode } from '../utils/db.errors';
import { ErrorCodes } from '../utils/error-codes';

import { GlobalExceptionFilter } from './global-exception.filter';

@Catch(QueryFailedError, EntityNotFoundError)
export class DBExceptionFilter implements ExceptionFilter {
  constructor(private readonly globalFilter: GlobalExceptionFilter) {}

  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof QueryFailedError) {
      const code = (exception as any).code;
      if (!code) {
        return this.globalFilter.catch(
          new BadRequestException({
            message: 'Database query failed',
            errorCode: 'DB_ERROR',
            errors: [{ message: (exception as any).message }],
          }),
          host,
        );
      }
      const fieldlastIndex = (exception as any).detail?.indexOf(')');
      let property;
      if ((exception as any).detail && fieldlastIndex !== -1) {
        property = ((exception as any).detail as string).substring(
          5,
          fieldlastIndex,
        );
      }
      switch (code) {
        case DBErrorCode.UNIQUE_VOILATION:
          return this.globalFilter.catch(
            new ConflictException({
              message: 'This value already exists',
              errorCode: 'UNIQUE_VIOLATION',
              errors: [
                {
                  property: property ?? undefined,
                  code: ErrorCodes.UNIQUE_VOILATION,
                  message: 'This value already exists',
                },
              ],
            }),
            host,
          );
        case DBErrorCode.NOT_NULL_CONSTRAINT:
          return this.globalFilter.catch(
            new BadRequestException({
              message: 'This field is required',
              errorCode: 'BAD_REQUEST',
              errors: [
                {
                  property: (exception as any).column ?? property ?? undefined,
                  code: ErrorCodes.NOT_NULL_CONSTRAINT,
                  message: 'This field is required',
                },
              ],
            }),
            host,
          );
        case DBErrorCode.CHECK_VOILATION:
          return this.globalFilter.catch(
            new ConflictException({
              message: 'Constraint violation',
              errorCode: 'BAD_REQUEST',
              errors: [
                {
                  property: property ?? undefined,
                  code: ErrorCodes.UNIQUE_VOILATION,
                  message: 'Constraint violation',
                },
              ],
            }),
            host,
          );
        case DBErrorCode.FORIGN_KEY_VIOLATION:
          const foreignKeyError = this.getForeignkeyViolationError(
            (exception as any).detail,
          );
          return this.globalFilter.catch(
            new ConflictException({
              message: 'Related record not found',
              errorCode: 'CONFLICT',
              errors: foreignKeyError ? [foreignKeyError] : [],
            }),
            host,
          );
        case DBErrorCode.INVALID_TEXT_REPRESENTATION:
          return this.globalFilter.catch(
            new BadRequestException({
              message: 'Invalid format',
              errorCode: 'INVALID_FORMAT',
              errors: [
                {
                  property: property ?? undefined,
                  code: ErrorCodes.INVALID_FORMAT,
                  message: 'Invalid format',
                },
              ],
            }),
            host,
          );
      }
      return this.globalFilter.catch(
        new BadRequestException({
          message: 'Database error',
          errorCode: 'DB_ERROR',
          errors: [{ message: (exception as any).message }],
        }),
        host,
      );
    } else if (exception instanceof EntityNotFoundError) {
      return this.globalFilter.catch(
        new NotFoundException({
          message: 'Resource not found',
          errorCode: ErrorCodes.RESOURCE_NOT_FOUND,
        }),
        host,
      );
    } else {
      return this.globalFilter.catch(exception, host);
    }
  }

  getForeignkeyViolationError(message: string) {
    const regex = /Key \(([^)]+)\)=\(([^)]+)\)/;
    const matches = message.match(regex);
    if (!matches || matches.length < 2) {
      console.warn('no matches found while error mapping', message);
      return null;
    }
    const key = matches[1];
    const value = matches[2];
    return {
      property: key,
      value,
      code: ErrorCodes.UNIQUE_VOILATION,
      message: 'Related record not found',
    };
  }
}
