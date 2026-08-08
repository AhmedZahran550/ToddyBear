import { Controller, Sse, Param, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SseService } from './sse.service';
import { Public } from '../../common/decorators/public.decorator';
import { ApiSseDocs, ApiDeviceEventsDocs } from '../../swagger/sse.swagger';

@ApiSseDocs()
@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @Public()
  @ApiDeviceEventsDocs()
  @Sse('devices/:macAddress/events')
  deviceEvents(
    @Param('macAddress') macAddress: string,
  ): Observable<MessageEvent> {
    return this.sseService.getStream(macAddress);
  }
}
