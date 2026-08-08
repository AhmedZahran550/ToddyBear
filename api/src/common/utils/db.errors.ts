
import {
  BadRequestException,
  ConflictException,
  HttpStatus,
} from '@nestjs/common';
import { ErrorCodes } from './error-codes';
import { AppErrorBase } from './error-response';

//https://hackage.haskell.org/package/postgresql-error-codes-1.0.1/docs/PostgreSQL-ErrorCodes.html
export enum DBErrorCode {
  UNIQUE_VOILATION = '23505',
  FORIGN_KEY_VIOLATION = '23503',
  CHECK_VOILATION = '23514',
  INVALID_TEXT_REPRESENTATION = '22P02',
  NOT_NULL_CONSTRAINT = '23502',
}

export enum ErrorGroup {
  INTIGRITY_CONSTRAINT_VIOLATION = 'INTIGRITY_CONSTRAINT_VIOLATION',
}

function handleError(error: any) {
  const code = (error as any).code;
  if (!code) {
    throw error;
  }
  let message = error.message;
  const dbError = getError(error);
  const fieldlastIndex = error.detail?.indexOf(')');
  let property;
  if (error.detail && fieldlastIndex !== -1) {
    property = (error.detail as string).substring(5, fieldlastIndex);
  }

  switch (code) {
    case DBErrorCode.UNIQUE_VOILATION:
      message = [
        {
          property: property ?? undefined,
          code: ErrorCodes.UNIQUE_VOILATION,
          constraint: error.constraint,
        },
      ];
      throw new ConflictException(message);
    case DBErrorCode.INVALID_TEXT_REPRESENTATION:
      message = [
        {
          property: property ?? undefined,
          code: ErrorCodes.INVALID_FORMAT,
        },
      ];
      throw new BadRequestException(message);
  }
  throw error;
}

function getError(error: any): AppErrorBase {
  const errorCode = (error as any).code;
  if (!errorCode) {
    throw error;
  }
  const message = error.message;
  let property = 'unknown';
  let errors;
  let code;
  switch (errorCode) {
    case DBErrorCode.UNIQUE_VOILATION:
      // dbError.category = ErrorGroup.INTIGRITY_CONSTRAINT_VIOLATION;
      const fieldlastIndex = error.detail.indexOf('")');
      property = (error.detail as string).substring(6, fieldlastIndex);
      errors = [
        {
          property,
          code: ErrorCodes.UNIQUE_VOILATION,
        },
      ];
      return {
        errorCode,
        message,
        statusCode: HttpStatus.CONFLICT,
        errors,
      };
    case DBErrorCode.FORIGN_KEY_VIOLATION:
      const forignKeyError = getForignKeyViolationError(error.detail);

      errors = forignKeyError ? [forignKeyError] : [];
      return {
        errorCode,
        message,
        statusCode: HttpStatus.CONFLICT,
        errors,
      };
    case DBErrorCode.INVALID_TEXT_REPRESENTATION:
      errors = [
        {
          property,
          code: ErrorCodes.INVALID_FORMAT,
          message,
        },
      ];
      return {
        errorCode,
        message,
        statusCode: HttpStatus.BAD_REQUEST,
        errors,
      };
    case DBErrorCode.NOT_NULL_CONSTRAINT:
      property = (error as any).column;
      errors = [
        {
          property,
          code: ErrorCodes.NOT_NULL_CONSTRAINT,
          message,
        },
      ];
      return {
        errorCode,
        message,
        statusCode: HttpStatus.BAD_REQUEST,
        errors,
      };
    default:
      return {
        errorCode,
        message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errors,
      };
  }
  // throw error;
}

function getForignKeyViolationError(message: string) {
  const regex = /Key \(([^)]+)\)=\(([^)]+)\)/;
  const matches = message.match(regex);
  if (!matches || matches.length < 2) {
    console.warn('no matches found while error mapping', message);
    return null;
  }
  const key = matches[1] || 'unknown';
  const value = matches[2];
  return {
    property: key,
    value,
    code: ErrorCodes.UNIQUE_VOILATION,
  };
}

export { getError, handleError };
