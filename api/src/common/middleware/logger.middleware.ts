import { Injectable, NestMiddleware, HttpException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { LogsService } from '../../modules/logs/logs.service';
import { redactSensitiveData } from '../utils/redact.util';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logsService: LogsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const requestId = uuidv4();
    (req as any).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    const startTime = Date.now();
    const { method, originalUrl, ip, body } = req;

    const skipBody =
      originalUrl?.startsWith('/api/auth/') ||
      originalUrl?.startsWith('/api/token');

    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;

      const user = (req as any).user;
      const userId = user?.id || null;

      const redactedBody =
        !skipBody && body && Object.keys(body).length > 0
          ? redactSensitiveData(body)
          : null;

      const rawError = (req as any).error;
      let errorData: any = null;
      if (rawError) {
        if (rawError instanceof HttpException) {
          const response = rawError.getResponse();
          errorData = {
            message: rawError.message,
            name: rawError.name,
            statusCode: rawError.getStatus(),
            response:
              typeof response === 'object' ? response : { message: response },
          };
        } else if (rawError instanceof Error) {
          errorData = {
            message: rawError.message,
            name: rawError.name,
            stack: rawError.stack,
          };
        } else if (typeof rawError === 'object') {
          errorData = rawError;
        } else {
          errorData = { message: String(rawError) };
        }
      }

      this.logsService
        .create({
          method,
          url: originalUrl,
          ip: ip || req.headers['x-forwarded-for']?.toString(),
          userId,
          statusCode,
          responseTime,
          requestBody: redactedBody,
          requestId,
          error: errorData,
        })
        .catch((err) => {
          console.error('Failed to save log to database', err);
        });
    });

    next();
  }
}
