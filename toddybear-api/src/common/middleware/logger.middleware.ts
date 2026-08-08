import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LogsService } from '../../modules/logs/logs.service';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logsService: LogsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, ip, body } = req;

    const originalSend = res.send;
    let responseBody: any;

    res.send = function (chunk: any) {
      responseBody = chunk;
      return originalSend.apply(res, arguments as any);
    };

    res.on('finish', () => {
      const durationMs = Date.now() - startTime;
      const statusCode = res.statusCode;

      let errorMessage: string | null = null;
      if (statusCode >= 400) {
        try {
          const parsed = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
          errorMessage = parsed?.message || parsed?.error || String(responseBody);
        } catch {
          errorMessage = typeof responseBody === 'string' ? responseBody : null;
        }
      }

      // Non-blocking fire-and-forget save to DB
      setImmediate(() => {
        this.logsService
          .create({
            method,
            url: originalUrl,
            statusCode,
            ip: (ip || req.socket.remoteAddress || '').replace('::ffff:', ''),
            requestBody: body ? JSON.stringify(body) : null,
            responseBody: typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody || {}),
            errorMessage,
            durationMs,
          })
          .catch((err) => {
            console.error('Failed to save HTTP log to database:', err?.message || err);
          });
      });
    });

    next();
  }
}
