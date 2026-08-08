import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseFormat<T> {
  ok: boolean;
  data: T;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ResponseFormat<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseFormat<T>> {
    return next.handle().pipe(
      map((data) => {
        // If data is already formatted or is a raw buffer/stream (e.g. audio stream/SSE), return directly
        if (
          data &&
          ((typeof data === 'object' && 'ok' in data) || data instanceof Buffer)
        ) {
          return data;
        }
        return {
          ok: true,
          data,
        };
      }),
    );
  }
}
