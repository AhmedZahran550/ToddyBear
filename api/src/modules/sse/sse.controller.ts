import { Controller, Sse, Param, Req, MessageEvent } from '@nestjs/common';
import type { Request } from 'express';
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
  @Sse('devices/:id/events')
  deviceEvents(
    @Param('id') id: string,
    @Req() req: Request,
  ): Observable<MessageEvent> {
    req.on('close', () => {
      this.sseService.removeStream(id);
    });

    return this.sseService.getStream(id);
  }
}
