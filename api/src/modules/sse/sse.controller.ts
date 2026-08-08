import { Controller, Sse, Param, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SseService } from './sse.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @Public()
  @Sse('devices/:macAddress/events')
  deviceEvents(
    @Param('macAddress') macAddress: string,
  ): Observable<MessageEvent> {
    return this.sseService.getStream(macAddress);
  }
}
