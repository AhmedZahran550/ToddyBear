import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { serializeBodyForLog } from '../utils/redact.util';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const resp = context.switchToHttp().getResponse();
    const { url, method, body } = context.switchToHttp().getRequest();
    const skipBody = url?.startsWith('/api/auth/') || url?.startsWith('/api/token');
    const now = Date.now();
    return next
      .handle()
      .pipe(
        tap(() =>
          this.logger.log(
            `${Date.now() - now}ms ${method} ${url} - ${resp.statusCode} ${
              !skipBody ? serializeBodyForLog(body) : ''
            }`,
          ),
        ),
      );
  }
}
